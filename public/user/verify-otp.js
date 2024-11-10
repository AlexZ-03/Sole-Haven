let countdown;
let timerElement = document.getElementById('timer');
let resendButton = document.getElementById('resendButton');
let otpContainer = document.getElementById('otpContainer');
let alreadyVerified = document.getElementById('alreadyVerified');

function startTimer(duration) {
  clearInterval(countdown);
  let timeLeft = duration;
  timerElement.textContent = `Resend OTP in ${timeLeft}s`;
  resendButton.disabled = true;

  countdown = setInterval(() => {
    timeLeft--;
    timerElement.textContent = `Resend OTP in ${timeLeft}s`;
    if (timeLeft <= 0) {
      clearInterval(countdown);
      timerElement.textContent = 'You can resend OTP now';
      resendButton.disabled = false;
    }
  }, 1000);
}

function sendOTP() {
  alert("OTP sent!");
  startTimer(60);
}

function validateOTPForm(){
    const otpInput = document.getElementById('otpInput').value;

    $.ajax({
        type: "POST",
        url: "verify-otp",
        data: {otp: otpInput},
        success: function(response){
            if(response.success){
                Swal.fire({
                    icon: "success",
                    title: "OTP verifed successfully",
                    showConfirmButton: false,
                    timer: 1500,
                }).then(() => {
                    window.location.href = response.redirectUrl;
                })
            } else {
                Swal.fire({
                    icon: "error",
                    title: 'Error',
                    text: response.message,
                })
            }
        }, error: function (){
            Swal.fire({
                icon: 'error',
                title: 'Invalid OTP',
                text: 'Please try again'
            })
        }
    })
    return false;
}

function resendOTP() {
    $.ajax({
        type: "POST",
        url: "resend-otp", 
        success: function(response) {
            if (response.success) {
                Swal.fire({
                    icon: "success",
                    title: "OTP has been resent successfully",
                    showConfirmButton: false,
                    timer: 1500,
                });
                startTimer(60);
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: response.message,
                });
            }
        },
        error: function() {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "An error occurred while resending the OTP. Please try again.",
            });
        }
    });
}

startTimer(60);