$(function () {
    $('.js-sweetalert').on('click', function () {
        var type = $(this).data('type');

        if (type === 'cancel') {
            showCancelMessage();
        }

    });
});

function showWithTitleMessage(title, msg) {
    swal({
        title: title,
        text: msg,
        html: true
    });
}

function showCancelMessage() {
    swal({
        title: "Are you sure?",
        text: "Do you really want to logout from the admin panel?",
        type: "warning",
        showCancelButton: true,
        closeOnConfirm: false,
        showLoaderOnConfirm: true
    }, function (isConfirm) {
        if (isConfirm) {
            swal("Logout!", "You have logged out successfully.", "success");
            setTimeout(function () {
                logoutAuth()
            }, 1500);   
        }
    });
}


function showDeleteConfirmationMessage() {
    return new Promise((resolve, reject)=>{
        swal({
            title: "Are you sure?",
            text: "Do you really want to delete this item?",
            type: "warning",
            showCancelButton: true,
            closeOnConfirm: true,
            showLoaderOnConfirm: true
        }, function (isConfirm) {
            if (isConfirm) {
                resolve(true)   
            }else{
                resolve(false)
            }
        });
    })
}

