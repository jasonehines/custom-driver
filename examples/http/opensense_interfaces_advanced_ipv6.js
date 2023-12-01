/**
 * Domotz Custom Driver 
 * Name: OPENSense Interfaces Stats Advanced IPV6
 * Description: This script is designed for retrieving advanced IPv6 interface statistics from an OPNsense firewall.
 * 
 * Communication protocol is HTTPS
 * 
 * Tested with FreeBSD OPNsense version: 13.2-RELEASE-p5
 *
 * Creates a Custom Driver Table with the following columns:
 *      - Cleared: The timestamp when the statistics were last cleared or reset
 *      - References: The number of references or connections associated with the interface
 *      - In traffic (ipv6 block): The amount of incoming IPv6 traffic that was blocked by the firewall
 *      - In traffic (ipv6 pass): The amount of incoming IPv6 traffic that was allowed or passed by the firewall
 *      - Out traffic (ipv6 block): The amount of outgoing IPv6 traffic that was blocked by the firewall
 *      - Out traffic (ipv6 pass): The amount of outgoing IPv6 traffic that was allowed or passed by the firewall
 * 
 **/

// interfaceName: Set it to 'ALL' to retrieve all interfaces,
// or specify a list of interfaces to filter and display only the selected interfaces.
var interfaceName = D.getParameter("interfaceName");

// Define the table with labeled columns for Advanced IPv6
var table = D.createTable(
    "Interfaces Advanced IPV6",
    [
        { label: "Cleared", type: D.valueType.DATETIME },
        { label: "References", type: D.valueType.NUMBER },
        { label: "In traffic (ipv6 block)", type: D.valueType.NUMBER },
        { label: "In traffic (ipv6 pass)", type: D.valueType.NUMBER },
        { label: "Out traffic (ipv6 block)", type: D.valueType.NUMBER },
        { label: "Out traffic (ipv6 pass)", type: D.valueType.NUMBER }
    ]
);

// Function to make an HTTP GET request to retrieve OPNSense Interfaces Stats for Advanced IPv6
function getInterfaces() {
    var d = D.q.defer();
    D.device.http.get({
        url: "/api/diagnostics/firewall/pf_statistics/interfaces",
        username: D.device.username(), //api key == username
        password: D.device.password(), //api secret == password
        protocol: "https",
        auth: "basic",
        jar: true,
        rejectUnauthorized: false

    }, function (error, response, body) {
        if (error) {
            console.error(error);
            D.failure(D.errorType.GENERIC_ERROR);
        }
        if (response.statusCode == 404) {
            D.failure(D.errorType.RESOURCE_UNAVAILABLE);
        }
        if (response.statusCode == 401 || response.statusCode === 403) {
            D.failure(D.errorType.AUTHENTICATION_ERROR);
        }
        if (response.statusCode != 200) {
            D.failure(D.errorType.GENERIC_ERROR);
        }
        d.resolve(JSON.parse(body));
    });
    return d.promise;
}

function sanitize(output){
    var recordIdReservedWords = ['\\?', '\\*', '\\%', 'table', 'column', 'history'];
    var recordIdSanitisationRegex = new RegExp(recordIdReservedWords.join('|'), 'g');
    return output.replace(recordIdSanitisationRegex, '').slice(0, 50).replace(/\s+/g, '-').toLowerCase();
}

// Function to extract and insert Interfaces Stats data into the custom driver table for Advanced IPv6
function extractData(data) {
    for (var interface in data.interfaces) {
        if (interface !== "all"){
            if (interfaceName[0].toLowerCase() === "all" || interfaceName.some(function(name) {
                return (interface.toLowerCase().indexOf(name.toLowerCase()) !== -1);
            })) { 
                var recordId = sanitize(interface);
                var cleared = data.interfaces[interface].cleared;
                var references = data.interfaces[interface].references;
                var in6_block_bytes = data.interfaces[interface].in6_block_bytes;
                var in6_pass_bytes = data.interfaces[interface].in6_pass_bytes;
                var out6_block_bytes = data.interfaces[interface].out6_block_bytes;
                var out6_pass_bytes = data.interfaces[interface].out6_pass_bytes;
                table.insertRecord(recordId, [
                    cleared,
                    references,
                    in6_block_bytes,
                    in6_pass_bytes,
                    out6_block_bytes,
                    out6_pass_bytes
                ]);
            }
        }
    }
    D.success(table);
}

/**
 * @remote_procedure
 * @label Validate OPENSense Device
 * @documentation This procedure is used to validate if data is accessible
 */
function validate(){
    getInterfaces()
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
 * @label Get OPENSense Interfaces Stats for Advanced IPv6
 * @documentation This procedure retrieves Interfaces Stats data from an OPNsense firewall for Advanced IPv6
 */
function get_status() {
    getInterfaces()
        .then(extractData)
        .catch(function (err) {
            console.error(err);
            D.failure(D.errorType.GENERIC_ERROR);
        });
}