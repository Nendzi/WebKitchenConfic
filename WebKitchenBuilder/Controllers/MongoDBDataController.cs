using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MongoDBLibrary;
using WebKitchenBuilder.Models;
using MongoDB.Driver;

namespace WebKitchenBuilder.Controllers
{
    [ApiController]
    public class MongoDBDataController : ControllerBase
    {
        readonly string databaseName = "Forge";
        readonly string collectionName = "some_collection";

        [HttpPost]
        [Route("api/forge/mongodb")]
        public async Task CreateNewUserRecord([FromBody] UserModel userModel)
        {
            UserModel user = new UserModel()
            {
                UserName = userModel.UserName,
                EncriptedPassword = userModel.EncriptedPassword,
                ForgeClient = userModel.ForgeClient,
                ForgeSecret = userModel.ForgeSecret
            };

            await MongoDBHandler.InsertAsync<UserModel>(user, databaseName, collectionName);
        }

        [HttpPost]
        [Route("api/forge/mongodb/user")]
        public async Task<List<UserModel>> GetUser([FromBody] UserModel userModel)
        {            
            var filter = Builders<UserModel>.Filter.Eq(x => x.UserName, userModel.UserName);
            var findedUser = await MongoDBHandler.FindWithFilterAsync<UserModel>(databaseName, collectionName,filter);
            return findedUser;
        }
    }

}
