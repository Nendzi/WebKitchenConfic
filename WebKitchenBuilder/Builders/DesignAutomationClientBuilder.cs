using Autodesk.Forge.Core;
using Autodesk.Forge.DesignAutomation;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;

namespace WebKitchenBuilder.Builders
{
    public class DesignAutomationClientBuilder
    {
        internal DesignAutomationClient Client { get; }

        public DesignAutomationClientBuilder(string forgeClientId, string forgeClientSecret)
        {
            Client = CreateDesignAutomationClient(forgeClientId, forgeClientSecret);
        }
        private DesignAutomationClient CreateDesignAutomationClient( string forgeClientId, string forgeClientSecret)
        {
            var forgeService = CreateForgeService(forgeClientId,  forgeClientSecret);

            //var rsdkCfg = configuration.GetSection("DesignAutomation").Get<Configuration>();
            //var options = (rsdkCfg == null) ? null : Options.Create(rsdkCfg);
            return new DesignAutomationClient(forgeService);
        }
        private ForgeService CreateForgeService(string forgeClientId, string forgeClientSecret)
        {
            var forgeConfig = new ForgeConfiguration();
            forgeConfig.ClientId = forgeClientId;
            forgeConfig.ClientSecret = forgeClientSecret; 
            var httpMessageHandler = new ForgeHandler(Options.Create(forgeConfig))
            {
                InnerHandler = new HttpClientHandler()
            };

            return new ForgeService(new HttpClient(httpMessageHandler));
        }        
    }    
}
