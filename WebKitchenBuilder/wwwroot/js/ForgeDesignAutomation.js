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

function prepareLists() {
}

function clearAccount() {
    jQuery.ajax({
        url: 'api/forge/designautomation/account',
        method: 'DELETE',
        success: function () {
            writeLog('Account cleared, all appbundles & activities deleted');
        }
    });
}

function prepareBucket() {
    writeLog("Preparing bucket");
    jQuery.ajax({
        url: 'api/forge/oss/buckets',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            bucketKey: 'kitchenconfig'
        }),
        success: function () {
            writeLog('Bucket kitchenconfig is created');
            //$('#appBuckets').jstree(true).refresh();
            prepareAppBucketTree();
            //createAppBundleActivity();            
        }
    });
}

function createAppBundleActivity() {
    startConnection(function () {
        writeLog("Defining appbundle and activity for " + "Autodesk.Inventor+2021");
        createAppBundle(function () {
            createActivity(function () {
                prepareLists();
            })
        });
    });
}

function createAppBundle(cb) {
    writeLog("Creating Bundle");
    jQuery.ajax({
        url: 'api/forge/designautomation/appbundles',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            zipFileName: 'KitchenConfig.bundle.zip',
            engine: 'Autodesk.Inventor+2021'
        }),
        success: function (res) {
            writeLog('AppBundle: ' + res.appBundle + ', v' + res.version);
            if (cb) cb();
        }
    });
}

function createActivity(cb) {
    writeLog("Creating activity");
    jQuery.ajax({
        url: 'api/forge/designautomation/activities',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            zipFileName: 'Kitchen.zip',
            engine: 'Autodesk.Inventor+2021'
        }),
        success: function (res) {
            writeLog('Activity: ' + res.activity);
            if (cb) cb();
        }
    });
}

function startWorkitem() {
    $("#forgeViewerVisibility").css("display", "none");
    $("#outputWindowVisibility").css("display", "initial");
    document.getElementById('outputWindow').innerHTML = '';
    writeLog("Starting Workitem");
    startConnection(function () {
        var formData = new FormData();
        formData.append('data', collectKitchenStructure());
        writeLog('Uploading input file...');
        $.ajax({
            url: 'api/forge/designautomation/workitems',
            data: formData,
            processData: false,
            contentType: false,
            type: 'POST',
            success: function (res) {
                writeLog('Workitem started: ' + res.workItemId);
            },
            error: function (err) {
                writeLog('Error has happend: ' + err);
            }
        });
    }, function (msg) { swapBoardToViewer(); });
}

function swapBoardToViewer() {
    $('#appBuckets').jstree(true).refresh();
    $("#forgeViewerVisibility").css("display", "initial");
    $("#outputWindowVisibility").css("display", "none");
}

function writeLog(text) {
    console.log(text);
    $('#outputWindow').append('<p style="border-top: 1px dashed #C0C0C0">' + text + '</p>');
    var elem = document.getElementById('outputWindow');
    elem.scrollTop = elem.scrollHeight;
}

var connection;
var connectionId;

function startConnection(onReady) {
    
    if (connection && connection.connectionState) {
        if (onReady) onReady();
        return;
    }
    connection = new signalR.HubConnectionBuilder().withUrl("/api/signalr/designautomation").build();

    connection.start()
        .then(function () {
            connection.invoke('getConnectionId')
                .then(function (id) {
                    connectionId = id; // we'll need this...
                    if (onReady) onReady();
                });
        });

    connection.on("downloadResult", function (url) {
        writeLog('<a href="' + url + '">Download result file here</a>');
    });

    connection.on("onComplete", function (message) {
        writeLog(message);
        $('#appBuckets').jstree(true).refresh();
        $("#forgeViewerVisibility").css("display", "initial");
        $("#outputWindowVisibility").css("display", "none");
    });
}