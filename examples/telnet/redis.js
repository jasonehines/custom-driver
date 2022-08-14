var _var = D.device.createVariable;
var telnet = D.device.sendTelnetCommand;


var redis_telnet_params = {
    port: 6379,
    negotiationMandatory: false,
    timeout: 10000,
    command: "info",
    onConnectCommand: "auth moome$2019\n"
};


function get_redis_info() {
    var d = D.q.defer();
    telnet(redis_telnet_params, function (out, err) {
        if (err) {
            console.error("error while executing command: " + command);
            console.error(err);
            D.failure();
        }
        d.resolve(out.split("\n"));
    });

    return d.promise;
}

function parse_info(results) {
    return results.map(function (line) {
        return line.split(":");
    }).filter(function (info) {
        return info.length == 2;
    }).filter(function (info) {
        return !info[0].match(/.*_human$/);
    }).map(function (info) {
        var key = info[0];
        var value = info[1].trim();
        return _var(key, key.split("_").join(" "), value);
    });
}


function failure(err){
    console.error(err);
    D.failure(D.errorType.GENERIC_ERROR);
}

/**
* @remote_procedure
* @label Validate Association
* @documentation This procedure is used to validate if the driver can be applied on a device during association as well as validate any credentials provided
*/
function validate() {
    get_redis_info()
        .then(function(){
            D.success();
        }).catch(failure);

}


/**
* @remote_procedure
* @label Get Device Variables
* @documentation This procedure is used for retrieving device * variables data
*/
function get_status() {
    get_redis_info()
        .then(parse_info)
        .then(D.success)
        .catch(failure);
}