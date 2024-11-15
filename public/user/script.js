const nameid = document.getElementById('name');
const emailid = document.getElementById('email');
const phoneid = document.getElementById('phone');
const passid = document.getElementById('password');
const cpassid = document.getElementById('conformPassword'); 

const errorName = document.getElementById('error-name');
const errorEmail = document.getElementById('error-email');
const errorPhone = document.getElementById('error-phone');
const errorPass = document.getElementById('error-password');
const errorCpass = document.getElementById('error-conformPassword');

const signform = document.getElementById('signform');

    function nameValidate() {
        errorName.style.display = "none";
        errorName.innerHTML = "";

        const nameValue = nameid.value;
        const namePattern = /^[A-Za-z\s]+$/;

        if (nameValue.trim() === "") {
            errorName.style.display = "block";
            errorName.innerHTML = "Please enter a valid name";
            console.log("Name validation failed: Empty name");
        } else if (!namePattern.test(nameValue)) {
            errorName.style.display = "block";
            errorName.innerHTML = "Name can only contain alphabets";
            console.log("Name validation failed: Invalid characters");
        } else if (nameValue.length < 3) {
            errorName.style.display = "block";
            errorName.innerHTML = "Name must be at least 3 letters long";
            console.log("Name validation failed: Name too short");
        
        } else {
            errorName.style.display = "none";
            errorName.innerHTML = "";
        }
    }

    function emailValidate() {
        errorEmail.style.display = "none";
        errorEmail.innerHTML = "";

        const emailValue = emailid.value;
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (emailValue.trim() === "") {
            errorEmail.style.display = "block";
            errorEmail.innerHTML = "Please enter a valid email";
            console.log("Email validation failed: Empty email");
        } else if (!emailPattern.test(emailValue)) {
            errorEmail.style.display = "block";
            errorEmail.innerHTML = "Invalid email format";
            console.log("Email validation failed: Invalid format");
        } else {
            errorEmail.style.display = "none";
        }
    }

    function phoneValidate() {
        errorPhone.style.display = "none";
        errorPhone.innerHTML = "";

        const phoneValue = phoneid.value;
        const phonePattern = /^[0-9]{10}$/;

        if (phoneValue.trim() === "") {
            errorPhone.style.display = "block";
            errorPhone.innerHTML = "Please enter a phone number";
            console.log("Phone validation failed: Empty phone number");
        } else if (!phonePattern.test(phoneValue)) {
            errorPhone.style.display = "block";
            errorPhone.innerHTML = "Phone number must be 10 digits";
            console.log("Phone validation failed: Invalid format");
        } else {
            errorPhone.style.display = "none";
        }
    }

    function passValidate() {
        errorPass.style.display = "none";
        errorPass.innerHTML = "";

        const passValue = passid.value;
        const passPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

        if (passValue.length < 8) {
            errorPass.style.display = "block";
            errorPass.innerHTML = "Password must be at least 8 characters";
            console.log("Password validation failed: Too short");
        } else if (!passPattern.test(passValue)) {
            errorPass.style.display = "block";
            errorPass.innerHTML = "Password must contain at least one letter, one number, and one special character";
            console.log("Password validation failed: Does not meet criteria");
        } else {
            errorPass.style.display = "none";
        }
    }

    function confirmPassValidate() {
        errorCpass.style.display = "none";
        errorCpass.innerHTML = "";

        const passValue = passid.value;
        const cpassValue = cpassid.value;

        if (cpassValue !== passValue) {
            errorCpass.style.display = "block";
            errorCpass.innerHTML = "Passwords do not match";
            console.log("Confirm password validation failed: Passwords do not match");
        } else {
            errorCpass.style.display = "none";
        }
    }

    document.addEventListener("DOMContentLoaded", function() {
        signform.addEventListener('submit', (e) => {
            nameValidate();
            emailValidate();
            phoneValidate();
            passValidate();
            confirmPassValidate();

            if (errorName.innerHTML || 
                errorEmail.innerHTML || 
                errorPhone.innerHTML || 
                errorPass.innerHTML || 
                errorCpass.innerHTML) {
                    console.log("Form submission prevented due to validation errors.");
                    e.preventDefault();
            }
        });
    });