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

function prepareInstructions() {
    writeLog('Application is ready for creating kitchen element');
    writeLog('On left site under Element configurator input width and Heigth for desired element');
    writeLog('Do not use element width under 300mm');
    writeLog('Choose one of possible types for front type');
    writeLog('Closed - is fixed panel without handle.');
    writeLog('Open - is space without any element, reserved for eg. oven');
    writeLog('Drawer - Moveable element with handle in the middle. After creating you can click on drawer front to open it. Click again to close it');
    writeLog('Double door - two moveable element which are able to be opened/closed separatly by clicking after creating');
    writeLog('Left door - one moveable element which is able to be opened/closed separatly on left side by clicking after creating');
    writeLog('Right door - one moveable element which is able to be opened/closed separatly on right side by clicking after creating');
    writeLog('Cassette - one moveable element which is able to be opened/closed separatly on down side by clicking after creating');
    writeLog('Input heigth in percentage of total kitchen element. Do not place % at the end of value');
    writeLog('Click on Add new to open new row for new front type.')
    writeLog('When you reach 100% then button Submit will be enabled and you can send created date to Forge on procceed');
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
            createAppBundleActivity();            
        }
    });
}

function createAppBundleActivity() {
    startConnection(function () {
        writeLog("Defining appbundle and activity for " + "Autodesk.Inventor+2021");
        createAppBundle(function () {
            createActivity(function () {
                document.getElementById('outputWindow').innerHTML = '';
                prepareInstructions();
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
        document.getElementById('responseMessage').innerHTML = '<a href="' + url + '">Download result file here</a>';
    });

    connection.on("onComplete", function (message) {
        writeLog('Work item is succesully finished. You can select your model to translate it in 3D model or download.');
        $('#appBuckets').jstree(true).refresh();
        //$("#forgeViewerVisibility").css("display", "initial");
        //$("#outputWindowVisibility").css("display", "none");
    });
}