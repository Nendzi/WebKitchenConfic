$(document).ready(function () {
    //$('#subButton').click(addNewUser);
    //$('#logInButton').click(loginUser);
    $('#clientID').click(instantLogin);
    //$("#wantedForgeClientID").change(forgeClientChanged);
})

function addNewUser() {    
    writeLog("Adding new user");
    var pass1 = document.getElementById("userPassword");
    var pass2 = document.getElementById("userConformedPassword");
    if (checkPassword(pass1)) {
        if (comparePasswords(pass1, pass2)) {
            jQuery.ajax({
                url: 'api/forge/mongodb',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    UserName: $('#userEmailAddress').val(),
                    EncriptedPassword: encriptPassword($('#userPassword').val()),
                    ForgeClient: $('#forgeClientID').val(),
                    ForgeSecret: $('#forgeClientSecret').val()
                }),
                success: function () {
                    writeLog("New user added succesfully");
                    document.getElementById("addingNewUserInfo").innerHTML = 'New user created successfully. Please log in.';
                },
                error: function () {
                    document.getElementById("addingNewUserInfo").innerHTML = 'Creation of new user went wrong.';
                }
            });
        }
    }
}

function checkPassword(inputTxt) {
    var passw = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;
    if (inputTxt.value.match(passw)) { return true; }
    else {
        alert('Password should have 6 to 20 characters at least one uppercase, at least one lowercase and at least one digit')
        return false;
    }
}

function comparePasswords(pass1, pass2) {
    if (pass1.value === pass2.value) { return true; }
    else {
        alert('Confirmed password does not match password');
        return false;
    }
}

function encriptPassword(pass) {
    var words = CryptoJS.enc.Utf8.parse(pass)
    var encPas = CryptoJS.enc.Base64.stringify(words);
    return encPas;
}

var resultFromDatabase = {};

function loginUser() {
    writeLog("Login existing user");
    jQuery.ajax({
        url: 'api/forge/mongodb/user',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            UserName: $('#loginEmailAddress').val(),
            EncriptedPassword: encriptPassword($('#loginPassword').val()),
            ForgeClient: 'prazno',
            ForgeSecret: 'prazno'
        }),
        success: function (res) {
            writeLog('Login passed successfully');
            resultFromDatabase = res;
            document.getElementById("loginInfo").innerHTML = 'Log was successfull. Please choose Forge client.';
            document.getElementById("logedUserName").innerHTML = $('#loginEmailAddress').val();
            var listOfForgeClients = document.getElementById("wantedForgeClientID").innerHTML;
            res.forEach(function (user) {
                listOfForgeClients += '<option>' + user.forgeClient + '</option>';
            });
            document.getElementById("wantedForgeClientID").innerHTML = listOfForgeClients;            
        },
        error: function () {
            document.getElementById("loginInfo").innerHTML = 'Login went wrong.';
        }
    });
}

var selectedCred = {
    forgeClient: 'prazno',
    forgeSecret: 'prazno'
}

function forgeClientChanged() {
    var e = document.getElementById("wantedForgeClientID");
    var strUser = e.value;
    resultFromDatabase.forEach(function (user) {
        if (user.forgeClient === strUser) {
            selectedCred.forgeClient = user.forgeClient;
            selectedCred.forgeSecret = user.forgeSecret
            sendCred(selectedCred);
            closeNavLogin();
        }
    })
}

function sendCred(input) {
    $.post({
        url: 'api/forge/oauth/cred',
        contentType: 'application/json',
        data: JSON.stringify({
            ForgeClient: input.forgeClient,
            ForgeSecret: input.forgeSecret
        }),
        success: function () {
            prepareAppBucketTree();
            prepareBucket();
            createAppBundleActivity();
            $("#forgeViewerVisibility").css("display", "initial");
            $("#outputWindowVisibility").css("display", "none");
        }
    });    
}

function instantLogin() {
    selectedCred.forgeClient = document.getElementById("forgeClientID").value;
    selectedCred.forgeSecret = document.getElementById("forgeClientSecret").value;

    sendCred(selectedCred);
}