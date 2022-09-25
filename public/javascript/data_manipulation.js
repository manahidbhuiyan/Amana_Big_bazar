const getData = (requestLink) => {
    return new Promise((resolve) => {
        axios({
            method: 'get',
            url: requestLink,
            headers: {
                'Content-Type': 'application/json'
            },
            json: true
        }).then((response) => {
            resolve({
                auth: true,
                response: response.data
            })
        }).catch((error) => {
            resolve({
                auth: false,
                response: error.response.data.errors
            })
        });
    })
}

const getSecureData = (requestLink, token) => {
    return new Promise((resolve) => {
        axios({
            method: 'get',
            url: requestLink,
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            json: true
        }).then((response) => {
            resolve({
                auth: true,
                response: response.data
            })
        }).catch((error) => {
            resolve({
                auth: false,
                response: error.response.data.errors
            })
        });
    })
}

const deleteData = (requestLink, propertyID, token) => {
    return new Promise((resolve) => {
        axios({
            method: 'delete',
            url: requestLink + propertyID,
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            json: true
        }).then((response) => {
            resolve({
                auth: true,
                response: response.data
            })
        }).catch((error) => {
            resolve({
                auth: false,
                response: error.response.data.errors
            })
        });
    })
}

const addNewData = (requestLink, dataInfo, token) => {
    return new Promise((resolve) => {
        axios({
            method: 'post',
            url: requestLink,
            data: dataInfo,
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            json: true
        }).then((response) => {
            resolve({
                auth: true,
                response: response.data
            })
        }).catch((error) => {
            resolve({
                auth: false,
                response: error.response.data.errors
            })
        });
    })
}

const uploadImageUpdateInfo = (requestLink, dataInfo, token) => {
    return new Promise((resolve) => {
        axios({
            method: 'put',
            url: requestLink,
            data: dataInfo,
            headers: {
                'Content-Type': 'multipart/form-data',
                'x-auth-token': token
            },
            json: true
        }).then((response) => {
            resolve({
                auth: true,
                response: response.data
            })
        }).catch((error) => {
            resolve({
                auth: false,
                response: error.response.data.errors
            })
        });
    })
}

const uploadExcelImportFile = (requestLink, dataInfo, token) => {
    return new Promise((resolve) => {
        axios({
            method: 'post',
            url: requestLink,
            data: dataInfo,
            headers: {
                'Content-Type': 'multipart/form-data',
                'x-auth-token': token
            },
            json: true
        }).then((response) => {
            resolve({
                response: response.data
            })
        }).catch((error) => {
            resolve({
                response: error.response.data.errors
            })
        });
    })
}

const updateDataInfo = (requestLink, dataInfo, token) => {
    return new Promise((resolve) => {
        axios({
            method: 'put',
            url: requestLink,
            data: dataInfo,
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            json: true
        }).then((response) => {
            resolve({
                auth: true,
                response: response.data
            })
        }).catch((error) => {
            resolve({
                auth: false,
                response: error.response.data.errors
            })
        });
    })
}

const convertTZ = (date, tzString) => {
    return new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", {timeZone: tzString}));
}