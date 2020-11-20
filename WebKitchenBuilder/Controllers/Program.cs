
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using Autodesk.Forge.Core;
using Autodesk.Forge.DesignAutomation;

namespace WebKitchenBuilder
{
    public class Program
    {
        public static void Main(string[] args)
        {
            CreateHostBuilder(args).ConfigureAppConfiguration(builder =>
            {
                builder.AddForgeAlternativeEnvironmentVariables();
            }).ConfigureServices((hostContext, services) =>
            {
                services.AddDesignAutomation(hostContext.Configuration);
            }).Build().Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .ConfigureWebHostDefaults(webBuilder =>
                {
                    webBuilder.UseStartup<Startup>();
                });
    }
}
