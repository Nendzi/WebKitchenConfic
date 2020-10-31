using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace WebKitchenBuilder.Models
{
    public class DeleteObjectModel
    {
        public string bucketKey { get; set; }
        public string objectKey { get; set; }
    }
}