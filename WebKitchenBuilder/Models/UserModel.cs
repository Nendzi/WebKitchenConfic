using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Bson.Serialization.IdGenerators;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace WebKitchenBuilder.Models
{
    public class UserModel
    {
        [BsonId(IdGenerator = typeof(StringObjectIdGenerator))]
        string UserId { get; set; }

        [BsonElement("username")]
        public string UserName { get; set; }

        [BsonElement("password")]
        public string EncriptedPassword { get; set; }

        [BsonElement("forgeId")]
        public string ForgeClient { get; set; }

        [BsonElement("forgeSecret")]
        public string ForgeSecret { get; set; }
    }
}
