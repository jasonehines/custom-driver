/**
 * Domotz Custom Driver 
 * Name: Linux Monitor IP Latency
 * Description: This script is designed to ping an IP address and retrieve the average latency and packet loss percentage.
 *   
 * Communication protocol is SSH
 * 
 * Tested on Linux Distributions:
 *      - Ubuntu 20.04 LTS
 * Shell Version:
 *      - Bash 5.1.16
 * 
 * Creates a Custom Driver table with a list of IP addresses, their average latency, and their packet loss.
 * 
 **/

var pktno = "2"; // Number of packets to send during the ping command.
var ipAddresses = ["8.8.8.8", "1.1.1.1", "192.168.0.1"]; // List of IP addresses to ping and retrieve status for.
// Set up the SSH command options
var sshCommandOptions = {
    "timeout": 30000
};

var tableColumns = D.createTable(
    "IP Latency",
    [
        { label: "IP Address" },
        { label: "Latency", unit: "ms" },
        { label: "Packet Loss", unit: "%" }
    ]
);

// A function to check for authentication errors during execution
function checkSshError(err) {
    if (err.message) console.error(err.message);
    if (err.code == 5) D.failure(D.errorType.AUTHENTICATION_ERROR);
    console.error(err);
    D.failure(D.errorType.GENERIC_ERROR);
}

/**
 * Excuting a simple command to test access to device:
 * 'ls' list the files and directories within a specified directory
 * @remote_procedure
 * @label Validate Association
 * @documentation This procedure is used to validate if the driver can be applied on a device during association as well as validate any credentials provided
 */
function validate() {
    var commandValidate = "ls";
    console.info("Verifying credentials ... ", commandValidate);
    function loginCallback(output, error) {
        if (error) {
            checkSshError(error);
        } else {
            D.success();
        }
    }
    sshCommandOptions["command"] = commandValidate;
    D.device.sendSSHCommand(sshCommandOptions, loginCallback);
}

/**
 * @remote_procedure
 * @label Get IP Latency
 * @documentation This procedure retrieves the latency of each IP address by sending ping commands.
 * It populates the Custom Driver table with the IP address, latency, and packet loss.
 */
function get_status() {
    var count = 0;
    ipAddresses.forEach(function(ipAddress) {
        console.info("Pinging " + ipAddress + " ... ");
        var command = "ping -c " + pktno + " " + ipAddress;
        sshCommandOptions["command"] = command;
        function resultCallback(output, error) {
            if (error) {
                checkSshError(error);
            } else {
                console.log(output);
                // Parse the output to get the latency and packet loss
                var matchLatency = /(\d+\.\d+)\/(\d+\.\d+)\/(\d+\.\d+)\/(\d+\.\d+) ms/.exec(output);
                var latencyValue = matchLatency[2];
                var matchPacketLoss = /(\d+)% packet loss/.exec(output);
                var packetLossValue = matchPacketLoss[1];

                var recordId = D.crypto.hash(ipAddress, "sha256", null, "hex").slice(0, 50);
                tableColumns.insertRecord(recordId, [ipAddress, latencyValue, packetLossValue]);
            }
            count++;
            if (count === ipAddresses.length) {
                D.success(tableColumns);
            }
        }
        D.device.sendSSHCommand(sshCommandOptions, resultCallback);
    });
}