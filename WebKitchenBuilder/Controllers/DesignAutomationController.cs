/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Forge Partner Development
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////

using Autodesk.Forge;
using Autodesk.Forge.DesignAutomation;
using Autodesk.Forge.DesignAutomation.Model;
using Autodesk.Forge.Model;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using RestSharp;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Activity = Autodesk.Forge.DesignAutomation.Model.Activity;
using Alias = Autodesk.Forge.DesignAutomation.Model.Alias;
using AppBundle = Autodesk.Forge.DesignAutomation.Model.AppBundle;
using Parameter = Autodesk.Forge.DesignAutomation.Model.Parameter;
using WorkItem = Autodesk.Forge.DesignAutomation.Model.WorkItem;
using WorkItemStatus = Autodesk.Forge.DesignAutomation.Model.WorkItemStatus;

namespace WebKitchenBuilder.Controllers
{
    [ApiController]
    public class DesignAutomationController : ControllerBase
    {
        // Used to access the application folder (temp location for files & bundles)
        private IWebHostEnvironment _env;
        // used to access the SignalR Hub
        private IHubContext<DesignAutomationHub> _hubContext;
        // Local folder for bundles
        public string LocalBundlesFolder { get { return Path.Combine(_env.WebRootPath, "bundles"); } }
        public string LocalDataSetFolder { get { return Path.Combine(_env.WebRootPath, "InputFiles"); } }
        // Engine
        public string EngineName { get { return "Autodesk.Inventor+2021"; } }
        // Bundle file
        public string ZipFileName { get { return "KitchenConfig.bundle.zip"; } }
        // Bundle name
        public string AppBundleName { get { return "KitchenConfig"; } }
        // Activity name
        public string ActivityName { get { return "KitchenConfig"; } }
        /// Prefix for AppBundles and Activities
        public static string NickName { get { return OAuthController.FORGE_CLIENT_ID; } }
        /// Alias for the app (e.g. DEV, STG, PROD). This value may come from an environment variable
        public static string Alias { get { return "dev"; } }
        // bucket name
        public string bucketKey => (NickName + "-" + AppBundleName).ToLower();
        // Design Automation v3 API
        DesignAutomationClient _designAutomation;

        // Constructor, where env and hubContext are specified
        public DesignAutomationController(IWebHostEnvironment env, IHubContext<DesignAutomationHub> hubContext, DesignAutomationClient api)
        {
            _designAutomation = api;
            _env = env;
            _hubContext = hubContext;
        }

        /// <summary>
        /// Names of app bundles on this project
        /// </summary>
        [HttpGet]
        [Route("api/appbundles")]
        public string[] GetLocalBundles()
        {
            // this folder is placed under the public folder, which may expose the bundles
            // but it was defined this way so it be published on most hosts easily
            return Directory.GetFiles(LocalBundlesFolder, "*.zip").Select(Path.GetFileNameWithoutExtension).ToArray();
        }

        /// <summary>
        /// Return a list of available engines
        /// </summary>
        [HttpGet]
        [Route("api/forge/designautomation/engines")]
        public async Task<List<string>> GetAvailableEngines()
        {
            dynamic oauth = await OAuthController.GetInternalAsync();

            // define Engines API
            Page<string> engines = await _designAutomation.GetEnginesAsync();
            engines.Data.Sort();

            return engines.Data; // return list of engines
        }

        /// <summary>
        /// Define a new appbundle
        /// </summary>
        [HttpPost]
        [Route("api/forge/designautomation/appbundles")]
        public async Task<IActionResult> CreateAppBundle() //([FromBody] JObject appBundleSpecs)
        {    
            // check if ZIP with bundle is here
            string packageZipPath = Path.Combine(LocalBundlesFolder, ZipFileName);
            if (!System.IO.File.Exists(packageZipPath))
            {
                throw new Exception("Appbundle not found at " + packageZipPath);
            }

            // get defined app bundles - but this line is wrong when running on heroku server instead of localhost.
            Page<string> appBundles = await _designAutomation.GetAppBundlesAsync();            

            // check if app bundle is already define
            dynamic newAppVersion;
            string qualifiedAppBundleId = string.Format("{0}.{1}+{2}", NickName, AppBundleName, Alias);
            if (!appBundles.Data.Contains(qualifiedAppBundleId))
            {
                // create an appbundle (version 1)
                AppBundle appBundleSpec = new AppBundle()
                {
                    Package = packageZipPath, //appBundleName,
                    Engine = EngineName,
                    Id = AppBundleName,
                    Description = "Creates an kitchen elements based on template files"
                };
                newAppVersion = await _designAutomation.CreateAppBundleAsync(appBundleSpec);
                if (newAppVersion == null)
                {
                    throw new Exception("Cannot create new app");
                }

                // create alias pointing to v1
                Alias aliasSpec = new Alias() { Id = Alias, Version = 1 };
                Alias newAlias = await _designAutomation.CreateAppBundleAliasAsync(AppBundleName, aliasSpec);
            }
            else
            {
                // create new version
                AppBundle appBundleSpec = new AppBundle()
                {
                    Engine = EngineName,
                    Description = AppBundleName
                };
                newAppVersion = await _designAutomation.CreateAppBundleVersionAsync(AppBundleName, appBundleSpec);
                if (newAppVersion == null)
                {
                    throw new Exception("Cannot create new version");
                }

                // update alias pointing to v+1
                AliasPatch aliasSpec = new AliasPatch()
                {
                    Version = newAppVersion.Version
                };
                Alias newAlias = await _designAutomation.ModifyAppBundleAliasAsync(AppBundleName, Alias, aliasSpec);
            }

            // upload the zip with .bundle
            RestClient uploadClient = new RestClient(newAppVersion.UploadParameters.EndpointURL);
            RestRequest request = new RestRequest(string.Empty, Method.POST);
            request.AlwaysMultipartFormData = true;
            foreach (KeyValuePair<string, string> x in newAppVersion.UploadParameters.FormData) request.AddParameter(x.Key, x.Value);
            request.AddFile("file", packageZipPath);
            request.AddHeader("Cache-Control", "no-cache");
            await uploadClient.ExecuteTaskAsync(request);

            return Ok(new { AppBundle = qualifiedAppBundleId, Version = newAppVersion.Version });
        }

        /// <summary>
        /// Helps identify the engine
        /// </summary>
        private dynamic EngineAttributes(string engine)
        {
            if (engine.Contains("3dsMax")) return new { commandLine = "$(engine.path)\\3dsmaxbatch.exe -sceneFile \"$(args[inputFile].path)\" $(settings[script].path)", extension = "max", script = "da = dotNetClass(\"Autodesk.Forge.Sample.DesignAutomation.Max.RuntimeExecute\")\nda.ModifyWindowWidthHeight()\n" };
            if (engine.Contains("AutoCAD")) return new { commandLine = "$(engine.path)\\accoreconsole.exe /i \"$(args[inputFile].path)\" /al \"$(appbundles[{0}].path)\" /s $(settings[script].path)", extension = "dwg", script = "UpdateParam\n" };
            if (engine.Contains("Inventor")) return new
            {
                commandLine = "$(engine.path)\\inventorcoreconsole.exe /i \"$(args[inputFile].path)\" /al \"$(appbundles[{0}].path)\" \"$(args[inputJson].path)\""
            };
            if (engine.Contains("Revit")) return new { commandLine = "$(engine.path)\\revitcoreconsole.exe /i \"$(args[inputFile].path)\" /al \"$(appbundles[{0}].path)\"", extension = "rvt", script = string.Empty };
            throw new Exception("Invalid engine");
        }

        /// <summary>
        /// Define a new activity
        /// </summary>
        [HttpPost]
        [Route("api/forge/designautomation/activities")]
        public async Task<IActionResult> CreateActivity([FromBody] JObject activitySpecs)
        {
            Page<string> activities = await _designAutomation.GetActivitiesAsync();
            string qualifiedActivityId = string.Format("{0}.{1}+{2}", NickName, ActivityName, Alias);
            if (!activities.Data.Contains(qualifiedActivityId))
            {
                // define the activity
                // ToDo: parametrize for different engines...
                dynamic engineAttributes = EngineAttributes(EngineName);
                string commandLine = string.Format(engineAttributes.commandLine, AppBundleName);
                Activity activitySpec = new Activity()
                {
                    Id = ActivityName,
                    Appbundles = new List<string>() { string.Format("{0}.{1}+{2}", NickName, AppBundleName, Alias) },
                    CommandLine = new List<string>() { commandLine },
                    Engine = EngineName,
                    Parameters = new Dictionary<string, Parameter>()
                    {
                        { "inputFile", new Parameter(){
                            Description = "IAM file to process",
                            LocalName = "CleanSlate.iam",
                            Verb = Verb.Get,
                            Zip = true }
                        },
                        { "inputJson", new Parameter() {
                            Description = "JSON file with User Params",
                            LocalName = "params.json",
                            Verb = Verb.Get,
                            Zip = false }
                        },
                        { "outputFile", new Parameter() {
                            Description = "Resulting assembly",
                            LocalName = @"Kitchen\Result",
                            Verb = Verb.Put,
                            Zip = true }
                        }
                    }
                };
                Activity newActivity = await _designAutomation.CreateActivityAsync(activitySpec);

                // specify the alias for this Activity
                Alias aliasSpec = new Alias() { Id = Alias, Version = 1 };
                Alias newAlias = await _designAutomation.CreateActivityAliasAsync(ActivityName, aliasSpec);

                return Ok(new { Activity = qualifiedActivityId });
            }

            // as this activity points to a AppBundle "dev" alias (which points to the last version of the bundle),
            // there is no need to update it (for this sample), but this may be extended for different contexts
            return Ok(new { Activity = "Activity already defined" });
        }

        /// <summary>
        /// Get all Activities defined for this account
        /// </summary>
        [HttpGet]
        [Route("api/forge/designautomation/activities")]
        public async Task<List<string>> GetDefinedActivities()
        {
            // filter list of 
            Page<string> activities = await _designAutomation.GetActivitiesAsync();
            List<string> definedActivities = new List<string>();
            foreach (string activity in activities.Data)
                if (activity.StartsWith(NickName) && activity.IndexOf("$LATEST") == -1)
                    definedActivities.Add(activity.Replace(NickName + ".", String.Empty));

            return definedActivities;
        }

        /// <summary>
        /// Start a new workitem
        /// </summary>
        [HttpPost]
        [Route("api/forge/designautomation/workitems")]
        public async Task<IActionResult> StartWorkitem([FromForm] StartWorkitemInput input)
        {
            // basic input validation
            JObject workItemData = JObject.Parse(input.data);
            string uniqueActivityName = string.Format("{0}.{1}+{2}", NickName, ActivityName, Alias);
            string browerConnectionId = workItemData["browerConnectionId"].Value<string>();

            // save the file on the server
            var fileSavePath = Path.Combine(LocalDataSetFolder, "Kitchen.zip");
            //using (var stream = new FileStream(fileSavePath, FileMode.Create)) await input.inputFile.CopyToAsync(stream);

            // OAuth token
            dynamic oauth = await OAuthController.GetInternalAsync();
            
            string inputFileNameOSS = string.Format("{0}_input_{1}", DateTime.Now.ToString("yyyyMMddhhmmss"), "Kitchen.zip"); // avoid overriding
            ObjectsApi objects = new ObjectsApi();
            objects.Configuration.AccessToken = oauth.access_token;
            using (StreamReader streamReader = new StreamReader(fileSavePath))
                await objects.UploadObjectAsync(bucketKey, inputFileNameOSS, (int)streamReader.BaseStream.Length, streamReader.BaseStream, "application/octet-stream");
            //System.IO.File.Delete(fileSavePath);// delete server copy

            // prepare workitem arguments
            // 1. input file
            XrefTreeArgument inputFileArgument = new XrefTreeArgument()
            {
                Verb = Verb.Get,
                LocalName = "Kitchen",
                PathInZip = "CleanSlate.iam",
                Url = string.Format("https://developer.api.autodesk.com/oss/v2/buckets/{0}/objects/{1}", bucketKey, inputFileNameOSS),
                Headers = new Dictionary<string, string>()
                {
                    { "Authorization", "Bearer " + oauth.access_token }
                }
            };
            // 2b. input json from viewer
            string inputJsonStr = workItemData.ToString(Newtonsoft.Json.Formatting.None).Replace("\"", "'");
            XrefTreeArgument inputJsonArgument = new XrefTreeArgument()
            {
                Verb = Verb.Get,
                Url = "data:application/json, " + inputJsonStr
            };
            // 3. output file
            string outputFileNameOSS = string.Format("{0}_output_{1}", DateTime.Now.ToString("yyyyMMddhhmmss"), "Kitchen.zip"); // avoid overriding
            XrefTreeArgument outputFileArgument = new XrefTreeArgument()
            {
                Url = string.Format("https://developer.api.autodesk.com/oss/v2/buckets/{0}/objects/{1}", bucketKey, outputFileNameOSS),
                Verb = Verb.Put,
                Headers = new Dictionary<string, string>()
                {
                    {"Authorization", "Bearer " + oauth.access_token }
                }
            };

            // prepare & submit workitem
            // the callback contains the connectionId (used to identify the client) and the outputFileName of this workitem
            string callbackUrl = string.Format(
                "{0}/api/forge/callback/designautomation?id={1}&outputFileName={2}",
                /*OAuthController.GetAppSetting("FORGE_WEBHOOK_URL"),
                "http://nedeljko-001-site1.etempurl.com", */
                "https://webkitchenbuilder.herokuapp.com/",
                browerConnectionId, outputFileNameOSS
                );
            WorkItem workItemSpec = new WorkItem()
            {
                ActivityId = uniqueActivityName,
                Arguments = new Dictionary<string, IArgument>()
                {
                    { "inputFile", inputFileArgument },
                    { "inputJson",  inputJsonArgument },
                    { "outputFile", outputFileArgument },
                    { "onComplete", new XrefTreeArgument { Verb = Verb.Post, Url = callbackUrl } }
                }
            };
            WorkItemStatus workItemStatus = await _designAutomation.CreateWorkItemAsync(workItemSpec);

            return Ok(new { workItemId = workItemStatus.Id });
        }

        /// <summary>
        /// Input for StartWorkitem
        /// </summary>
        public class StartWorkitemInput
        {
            public IFormFile inputFile { get; set; }
            public string data { get; set; }
        }

        /// <summary>
        /// Callback from Design Automation Workitem (onProgress or onComplete)
        /// </summary>
        [HttpPost]
        [Route("/api/forge/callback/designautomation")]
        public async Task<IActionResult> OnCallback(string id, string outputFileName, [FromBody] dynamic body)
        {
            try
            {
                // your webhook should return immediately! we can use Hangfire to schedule a job
                JObject bodyJson = JObject.Parse((string)body.ToString());
                await _hubContext.Clients.Client(id).SendAsync("onComplete", bodyJson.ToString());

                var client = new RestClient(bodyJson["reportUrl"].Value<string>());
                var request = new RestRequest(string.Empty);

                // send the result output log to the client
                byte[] bs = client.DownloadData(request);
                string report = System.Text.Encoding.Default.GetString(bs);
                await _hubContext.Clients.Client(id).SendAsync("onComplete", report);

                // generate a signed URL to download the result file and send to the client
                ObjectsApi objectsApi = new ObjectsApi();
                dynamic signedUrl = await objectsApi.CreateSignedResourceAsyncWithHttpInfo(bucketKey, outputFileName, new PostBucketsSigned(10), "read");
                await _hubContext.Clients.Client(id).SendAsync("downloadResult", (string)(signedUrl.Data.signedUrl));
            }
            catch { }

            // ALWAYS return ok (200)
            return Ok();
        }

        /// <summary>
        /// Clear the accounts (for debugging purpouses)
        /// </summary>
        [HttpDelete]
        [Route("api/forge/designautomation/account")]
        public async Task<IActionResult> ClearAccount()
        {
            // clear account
            await _designAutomation.DeleteForgeAppAsync("me");
            return Ok();
        }
    }
    /// <summary>
    /// Class uses for SignalR
    /// </summary>
    public class DesignAutomationHub : Microsoft.AspNetCore.SignalR.Hub
    {
        public string GetConnectionId() { return Context.ConnectionId; }
    }
}
