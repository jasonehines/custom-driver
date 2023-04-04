/**
 * Domotz Custom Driver 
 * Name: Windows Failed Logon attempts
 * Description: monitors the failed logon on a Windows computer
 *   
 * Communication protocol is WinRM
 * 
 * Tested on Windows Versions:
 *      - Microsoft Windows Server 2019
 * Powershell Version:
 *      - 5.1.19041.2364
 * 
 * Creates a Custom Driver table with the list of current logged in users
 * 
 * Privilege required: Administrator
 * 
**/


var winrmConfig = {
    "command": 'Start-Process quser -NoNewWindow -RedirectStandardError "NUL"',
    "username": D.device.username(),
    "password": D.device.password()
};

// Check for Errors on the WinRM command response
function checkWinRmError(err) {
    if (err.message) console.error(err.message);
    if (err.code == 401) D.failure(D.errorType.AUTHENTICATION_ERROR);
    if (err.code == 404) D.failure(D.errorType.RESOURCE_UNAVAILABLE);
    console.error(err);
    D.failure(D.errorType.GENERIC_ERROR);
}


/**
* @remote_procedure
* @label Validate WinRM is working on device
* @documentation This procedure is used to validate if the driver can be applied on a device during association as well as validate any credentials provided
*/
function validate() {
    D.device.sendWinRMCommand(winrmConfig, function (output) {
        if (output.error === null) {
            D.success();
        } else {
            checkWinRmError(output.error);
        }
    });
}

/**
* @remote_procedure
* @label Get Host current user sessions
* @documentation This procedure retrieves current logged in users data
*/
function get_status() {
    D.device.sendWinRMCommand(winrmConfig, parseOutput);
}

var usersTable = D.createTable(
    "Logged In Users",
    [

        { label: "State" },
        { label: "Logon Time" },
        { label: "Session ID" },
        { label: "Idle Time" },
        { label: "Session Name" }


    ]
);

function parseOutput(output) {
    console.log(JSON.stringify(output));
    if ((output.error === null)) {
        var outputLines = output.outcome.stdout.split(/\r?\n/);
        var line = '';
        var words = [];
        var username;
        var sessionId;
        var status;
        var idleTime;
        var logonTime;
        var idxOffset = 0;
        var k = 1;
        while (k < outputLines.length) {
            line = outputLines[k];
            if (line !== '') {
                line = line.replace(/\s\s+/g, ' ');
                words = line.split(' ').slice(1);
                if (words.length === 7) {
                    sessionName = '';
                } else {
                    sessionName = words[1];
                    idxOffset = 1;
                }
                username = words[0];
                sessionId = words[1 + idxOffset];
                status = words[2 + idxOffset];
                idleTime = words[3 + idxOffset];
                logonTime = words[4 + idxOffset] +
                    ' ' + words[5 + idxOffset] +
                    ' ' + words[6 + idxOffset];
                usersTable.insertRecord(username, [status, logonTime, sessionId, idleTime, sessionName]);

            }
            k++;
        }

        D.success(usersTable);

    } else {
        console.error(output.error);
        D.failure();
    }
}



