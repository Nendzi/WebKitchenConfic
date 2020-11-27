function openNavSignin() {
    var loginWidth = document.getElementById("mySidenavLogin").style.width;
    if (loginWidth == "350px"){
        document.getElementById("mySidenavSignin").style.width = "0px";
        }
    else{
        document.getElementById("mySidenavSignin").style.width = "350px";
        document.body.style.backgroundColor = "rgba(0,0,0,0.2)";
    }
}

function closeNavSignin() {
    document.getElementById("mySidenavSignin").style.width = "0";
    document.body.style.backgroundColor = "white";
}
function openNavLogin() {
    var signinidth = document.getElementById("mySidenavSignin").style.width;
    if (signinidth == "350px") {
        document.getElementById("mySidenavLogin").style.width = "0px";
       }
    else{
        document.getElementById("mySidenavLogin").style.width = "350px";
        document.body.style.backgroundColor = "rgba(0,0,0,0.2)";
    }
}
function closeNavLogin() {
    document.getElementById("mySidenavLogin").style.width = "0";
    document.body.style.backgroundColor = "white";
   }
