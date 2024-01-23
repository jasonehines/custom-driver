/**
 * Domotz Custom Driver 
 * Name: Sonicwall Additional security services license
 * Description: Monitors the license status of additional security services on a SonicWALL device
 * 
 * Communication protocol is HTTPS
 * 
 * Tested on SonicWALL NSv 270 SonicOS version 7.0.1
 *
 * Creates a Custom Driver variables: 
 *  - Content Filtering license
 *  - DNS security service license
 *  - Anti-Spam Service license
 *  - Endpoint security - Client Capture license
 *  - Capture Advanced Threat Protection license
 * 
 **/

// The variable "servicesToMonitor" is used to specify the desired services to monitor,
// set to "ALL" to retrieve license status for all additional security services,
// or specify a list of service names to filter and display only the selected services
// Possible values: ["cfs", "dns", "cass", "cees", "capture"]
var servicesToMonitor =  D.getParameter("servicesToMonitor");

//Processes the HTTP response and handles errors
function processResponse(d) {
    return function process(error, response, body) {
        if (error) {
            console.error(error);
            D.failure(D.errorType.GENERIC_ERROR);
        }
        if (response.statusCode == 404) {
            D.failure(D.errorType.RESOURCE_UNAVAILABLE);
        }
        if (response.statusCode == 401) {
            D.failure(D.errorType.AUTHENTICATION_ERROR);
        }
        if (response.statusCode != 200) {
            D.failure(D.errorType.GENERIC_ERROR);
        }
        d.resolve(JSON.parse(body));
    };
}

/**
 * Logs in to the SonicWALL device using basic authentication.
 * @returns A promise that resolves on successful login.
 */
function login() {
    var d = D.q.defer();
    var config = {
        url: "/api/sonicos/auth",
        username: D.device.username(),
        password: D.device.password(),
        protocol: "https",
        auth: "basic",
        jar: true,
        rejectUnauthorized: false
    };
    D.device.http.post(config, processResponse(d));
    return d.promise;
}

// Retrieves security services data from the SonicWALL device.
function getSecurityServices() {
    var d = D.q.defer();
    var config = {
        url: "/api/sonicos/dynamic-file/getDashboardData.json",
        protocol: "https",
        jar: true,
        rejectUnauthorized: false
    };
    D.device.http.get(config, processResponse(d));
    return d.promise;
}

// Extracts data from the retrieved additional security services data and creates Custom Driver variables.
function extractData(data) {
    var availableServices = {
        "cfs": "Content Filtering license",
        "dns": "DNS security Service license",
        "cass": "Anti-Spam Service license",
        "cees": "Endpoint security - Client Capture license",
        "capture": "Capture Advanced Threat Protection license"
    };
    
    var variables = [];
    if (servicesToMonitor[0].toUpperCase() === "ALL") {
        for (var service in availableServices) {
            var uid = service + "-licensed";
            var label = availableServices[service];
            var licenseStatus = data[service] ? data[service].licensed : "";
            licenseStatus = licenseStatus.toString().replace(/true/g, "Active").replace(/false/g, "Not active");
            variables.push(D.createVariable(uid, label, licenseStatus, null, D.valueType.STRING));
        }
    } else {
        servicesToMonitor.forEach(function (service) {
            var serviceID = service.toLowerCase();
            if (availableServices[serviceID]) {
                var uid = serviceID + "-licensed";
                var label = availableServices[serviceID];
                var licenseStatus = data[serviceID] ? data[serviceID].licensed : "";
                licenseStatus = licenseStatus.toString().replace(/true/g, "Active").replace(/false/g, "Not active");
                variables.push(D.createVariable(uid, label, licenseStatus, null, D.valueType.STRING));
            } 
        });
    }

    var filteredVariables = variables.filter(function(variable) { return variable.value; });
    D.success(filteredVariables);
}

/**
 * @label Validate Connection 
 * @documentation This procedure is used to validate the connection and data retrieval from the SonicWALL device.
 */
function validate(){
    login()
        .then(getSecurityServices)
        .then(function (response) {
            if (response) {
                console.info("Data available");
                D.success();
            } else {
                console.error("No data available");
                D.failure(D.errorType.GENERIC_ERROR);
            }
        })
        .catch(function (err) {
            console.error(err);
            D.failure(D.errorType.GENERIC_ERROR);
        });
}

/**
 * @remote_procedure
 * @label Get Additional Security Services License
 * @documentation This procedure monitors the license status of various additional security services.
 */
function get_status() {
    login()
        .then(getSecurityServices)
        .then(extractData)
        .catch(function (err) {
            console.error(err);
            D.failure(D.errorType.GENERIC_ERROR);
        });
}