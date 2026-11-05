using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Web;

namespace GateWay.App
{
 
    public class BaseResponse
    {
        public bool IsSuccess { get; set; }
        public string ErrorMessage { get; set; }
        public int StatusCode { get; set; }
        public object Response { get; set; } 
        public long ExecutionTimeMs { get; set; }

        public BaseResponse(object _Response = null, long executionTimeMs = 0)
        {
            SucessResponse(_Response, executionTimeMs); 
        }

        public BaseResponse(HttpStatusCode _StatusCode, string _ErrorMessage)
        {
            ErrorResponse(_StatusCode, _ErrorMessage);
        }

        private void SucessResponse(object _Response , long _executionTimeMs = 0)
        {
            this.IsSuccess = true;
            this.Response = _Response;
            this.ExecutionTimeMs = _executionTimeMs;
            this.StatusCode = Convert.ToInt32(HttpStatusCode.OK);
        }

        private void ErrorResponse(HttpStatusCode _StatusCode, string _ErrorMessage)
        {
            this.IsSuccess = false;
            this.StatusCode = Convert.ToInt32(_StatusCode);
            this.ErrorMessage = _ErrorMessage;
        }
    }
}