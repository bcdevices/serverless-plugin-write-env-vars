'use strict';

var _ = require('underscore'),
    expect = require('expect.js'),
    sinon = require('sinon'),
    path = require('path'),
    rewire = require('rewire'),
    Plugin = rewire('../index.js');

describe('serverless-plugin-write-env-vars', function() {

   describe('init', function() {

      it('registers the appropriate hook', function() {
         var plugin = new Plugin();

         expect(plugin.hooks['before:deploy:function:packageFunction']).to.be.a('function');
         expect(plugin.hooks['after:deploy:function:packageFunction']).to.be.a('function');
         expect(plugin.hooks['before:package:createDeploymentArtifacts']).to.be.a('function');
         expect(plugin.hooks['after:package:createDeploymentArtifacts']).to.be.a('function');
         expect(plugin.hooks['before:invoke:local:invoke']).to.be.a('function');
         expect(plugin.hooks['after:invoke:local:invoke']).to.be.a('function');
         expect(plugin.hooks['before:offline:start:init']).to.be.a('function');
         expect(plugin.hooks['after:offline:start:end']).to.be.a('function');
      });


      function testHookRegistration(hook, fn) {
         it('registers ' + hook + ' that calls ' + fn, function() {
            var spy = sinon.spy(),
                functions = {},
                ExtPlugin, plugin;

            functions[fn] = spy;
            ExtPlugin = Plugin.extend(functions);

            plugin = new ExtPlugin();
            plugin.hooks[hook]();

            expect(spy.called).to.be.ok();
            expect(spy.calledOn(plugin));
         });
      }

      testHookRegistration('before:deploy:function:packageFunction', 'writeEnvironmentFile');
      testHookRegistration('after:deploy:function:packageFunction', 'deleteEnvironmentFile');
      testHookRegistration('before:package:createDeploymentArtifacts', 'writeEnvironmentFile');
      testHookRegistration('after:package:createDeploymentArtifacts', 'deleteEnvironmentFile');
      testHookRegistration('before:invoke:local:invoke', 'writeEnvironmentFile');
      testHookRegistration('after:invoke:local:invoke', 'deleteEnvironmentFile');
      testHookRegistration('before:offline:start:init', 'writeEnvironmentFile');
      testHookRegistration('after:offline:start:end', 'deleteEnvironmentFile');

   });


   describe('getEnvFilePath', function() {

      it('returns the correct path', function() {
         var plugin = new Plugin({ config: { servicePath: '/tmp/foo' } });

         expect(plugin.getEnvFilePath()).to.eql(path.join('/tmp/foo', '.env'));
      });

   });


   describe('writeEnvironmentFile', function() {

      it('formats the output correctly and writes it to the correct place', function() {
         var filePath = path.join('/tmp/foo', '.env'),
             vars = { FOO: 'bar', TEST123: 'xyz' },
             content = 'FOO=bar\nTEST123=xyz',
             fsStub = { writeFile: _.noop },
             mock = sinon.mock(fsStub),
             sls, plugin, revert;

         mock.expects('writeFile').once().withArgs(filePath, content).callsArg(2);
         revert = Plugin.__set__('fs', fsStub);

         sls = {
            config: { servicePath: '/tmp/foo' },
            service: { custom: { writeEnvVars: vars } },
            cli: { log: _.noop },
         };

         plugin = new Plugin(sls);

         return plugin.writeEnvironmentFile()
            .then(function() {
               mock.verify();
               revert();
            });
      });

   });


   describe('deleteEnvironmentFile', function() {

      function runTest(exists) {
         var filePath = path.join('/tmp/foo', '.env'),
             fsStub = { stat: _.noop, unlink: _.noop },
             mock = sinon.mock(fsStub),
             sls, plugin, revert;

         if (exists) {
            mock.expects('stat').once().withArgs(filePath).callsArg(1);
            mock.expects('unlink').once().withArgs(filePath).callsArg(1);
         } else {
            mock.expects('stat').once().withArgs(filePath).throws();
         }

         revert = Plugin.__set__('fs', fsStub);

         sls = {
            config: { servicePath: '/tmp/foo' },
            cli: { log: _.noop },
         };

         plugin = new Plugin(sls);

         return plugin.deleteEnvironmentFile()
            .then(function() {
               mock.verify();
               revert();
            });
      }

      it('invokes the proper functions - when file exists', function() {
         runTest(true);
      });

      it('invokes the proper functions - when file does not exist', function() {
         runTest(false);
      });

   });

});
