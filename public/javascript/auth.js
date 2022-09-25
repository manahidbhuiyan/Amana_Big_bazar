const authChecker = (token) => {
    return new Promise((resolve)=>{
        axios({
            method: 'get',
            url: '/api/admin',
            headers: {
                'x-auth-token': token
            },
            json: true
        }).then((response) => {
            let domain = (new URL(window.location.href));
            document.cookie = `token=${token}; path=/; domain=${domain.hostname}`;
            resolve({
                auth: true,
                response: response
            })
        }).catch((error) => {
            console.log(error.response)
            resolve({
                auth: false,
                response: error.response
            })
        });
    })
}

const loginAuth = (email, password) => {
    return new Promise((resolve)=>{
        axios({
            method: 'post',
            url: '/api/admin/login',
            data: {
                email: email.trim(),
                password: password.trim()
            },
            headers: {
                'Content-Type': 'application/json'
            },
            json: true
        }).then((response) => {
            localStorage.token = response.data.token
            let domain = (new URL(window.location.href));
            document.cookie = `token=${response.data.token}; path=/; domain=${domain.hostname}`;
            resolve({
                auth: true,
                response:  response.data.token
            })
        }).catch((error) => {
            resolve({
                auth: false,
                response:  error.response.data.errors
            })
        });
    })
}


const forgotPassword = (email) => {
    return new Promise((resolve)=>{
        axios({
            method: 'post',
            url: '/api/admin/forgot',
            data: {
                email: email.toLowerCase().trim()
            },
            headers: {
                'Content-Type': 'application/json'
            },
            json: true
        }).then((response) => {
            resolve({
                auth: true,
                response:  response.data
            })
        }).catch((error) => {
            resolve({
                auth: false,
                response:  error.response.data.errors
            })
        });
    })
}

const passwordResetLinkCheck = (token) => {
    return new Promise((resolve)=>{
        axios({
            method: 'get',
            url: '/api/admin/reset/'+token,
            headers: {
                'Content-Type': 'application/json'
            },
            json: true
        }).then((response) => {
            resolve({
                auth: true,
                response:  response.data
            })
        }).catch((error) => {
            resolve({
                auth: false,
                response:  error.response.data.errors
            })
        });
    })
}

const setNewPassword = (password, confirm_password, token) => {
    return new Promise((resolve)=>{
        axios({
            method: 'post',
            url: '/api/admin/password/reset',
            data: {
                password: password.trim(),
                confirm_password: confirm_password.trim(),
                token: token
            },
            headers: {
                'Content-Type': 'application/json'
            },
            json: true
        }).then((response) => {
            resolve({
                auth: true,
                response:  response.data
            })
        }).catch((error) => {
            resolve({
                auth: false,
                response:  error.response.data.errors
            })
        });
    })
}