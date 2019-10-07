"use strict";
const request = require('requestretry');
const {createLogger, format, transports} = require('winston');
const {combine, timestamp} = format;

class AristonApi {
  constructor(login, password, heaterID, logLevel = 'error', connectionOptions = {maxAttempts: 10, retryDelay: 5000, timeout: 10000}) {
    this.req = request.defaults({
      jar: true,
      maxAttempts: connectionOptions.maxAttempts,
      retryDelay: connectionOptions.retryDelay,
      delayStrategy: this.constructExponentialBackoffStrategy(),
      json: true,
      timeout: connectionOptions.timeout
    });
    this.heaterID = heaterID;
    this.credentials = {};
    this.credentials.login = login;
    this.credentials.password = password;
    this.commonHeaders = {
      'Sec-Fetch-Site': 'same-origin',
      'DNT': '1',
      'Content-Type': 'application/json; charset=UTF-8',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36',
      'Referer': 'https://www.ariston-net.remotethermo.com/Menu/User/Index/' + this.heaterID
    };

    this.logger = createLogger({
      level: logLevel,
      format: combine(
        timestamp(),
        format.simple(),
        format.json(),
      ),
      transports: [new transports.Console()]
    });

    this.lastToken = "";
  }

  // Because of requestretry library
  getExponentialBackoff(attempts) {
    return (Math.pow(2, attempts) * 100) + Math.floor(Math.random() * 50);
  }

  // Because of requestretry library
  constructExponentialBackoffStrategy() {
    let attempts = 0;
    return () => {
      attempts += 1;
      return this.getExponentialBackoff(attempts);
    };
  }

  login() {
    return new Promise((resolve, reject) => {
      try {
        let form = {form: {Email: this.credentials.login, Password: this.credentials.password, RememberMe: false}};
        let url = 'https://www.ariston-net.remotethermo.com/Account/Login';
        this.logger.debug("Sending request to:" + url, form);
        this.req.post(url,
          form,
          (e, r, body) => {
            //we need redirect
            if (e || r.statusCode !== 302) {
              this.logger.error("Login Error");
              reject(e, r, body);
            } else {
              this.logger.info("Login OK");
              resolve(true)
            }
          }
        )
        ;
      } catch (e) {
        reject(e);
      }
    });
  }

  sendPost(url, data, zone = "", requestLogName = '') {
    return new Promise((resolve, reject) => {
      let zoneVar = '';
      if (parseInt(zone)) {
        zoneVar = "&zoneNum=" + parseInt(zone)
      }
      try {
        this.logger.debug({message: "Sending POST: ", url: url, data: data, requestName: requestLogName});
        this.req.post(
          {
            url: url + zoneVar,
            body: data,
            headers: this.commonHeaders,
          },
          (e, r, body) => {
            if (e || r.statusCode !== 200) {
              this.logger.error({message: "Request POST problem", body: body, error: e, reques: r, requestName: requestLogName});
              reject(e, r, body);
            } else {
              this.logger.info("Request OK (post) " + requestLogName);
              this.logger.debug(body);
              resolve(body);
            }
          });
      } catch (e) {
        reject(e);
      }
    });
  }

  sendGet(url, params, requestLogName = '') {
    return new Promise((resolve, reject) => {
      try {
        // let url = url + ids.join(',') + '&umsys=si';
        this.logger.debug({message: "Sending GET", url: url, params: params, requestName: requestLogName});
        params.umsys = 'si';
        this.req.post(
          {
            qs: params,
            url: url,
            headers: this.commonHeaders,
          },
          (e, r, body) => {
            if (e || r.statusCode !== 200) {
              this.logger.info({message: "Request GET error", body: body, error: e, request: r, requestName: requestLogName});
              reject(e, r, body);
            } else {
              if (body) {
                this.logger.info("Request OK " + requestLogName);
                this.logger.debug(body);
                resolve(body);
              } else {
                this.logger.error({message: "Request GET problem", body: body, request: r, requestName: requestLogName});
                reject(false);
              }
            }
          });
      } catch (e) {
        reject(e);
      }
    });
  }

  setVariable(data, zone = "") {
    return this.sendPost('https://www.ariston-net.remotethermo.com/Menu/User/Submit/' + this.heaterID + '?umsys=si', data, zone);
  }

  getVariable(ids) {
    return this.sendGet('https://www.ariston-net.remotethermo.com/Menu/User/Refresh/' + this.heaterID, {
      paramIds: ids.join(', ')
    });
  }

  setComfortStatus(status) {
    let oldStatus = status === 0 ? 2 : 0;
    status = status.toString();
    return this.setVariable([{"id": "U6_9_2", "newValue": status, "oldValue": oldStatus}]).then(() => {
      return this.getComfortStatus();
    });
  }


  getComfortStatus() {
    return this.getVariable(["U6_9_2"]).then((result) => {
      if (result[0] && result[0].hasOwnProperty('value')) {
        return result[0]['value'];
      }
    });
  }

  setStatus(data, zone = 1) {
    return this.getStatus().then((oldStatus) => {
      let previousValues = {
        zone: oldStatus.zone,
        mode: oldStatus.mode
      };
      let newValues = {
        ...previousValues,
        ...data
      };

      let newStatus = {
        "NewValue": newValues,
        "OldValue": {
          "mode": oldStatus.mode,
          "zone": oldStatus.zone
        }
      };
      return this.sendPost('https://www.ariston-net.remotethermo.com/PlantDashboard/SetPlantAndZoneData/' + this.heaterID + '?umsys=si', newStatus, zone);
    });
  }

  getGasUsage() {
    let tm = Math.floor(Date.now() / 1000);
    return this.sendGet('https://www.ariston-net.remotethermo.com/Metering/GetData/' + this.heaterID, {
      kind: 1,
      rnd: tm,
      '&_': tm,
    }).then((values) => {
      let waterDay = 0;
      let heatintDay = 0;
      for (let x = 0; x <= 11; x++) {
        waterDay += values.daily.data[x].y;
        heatintDay += values.daily.data[x].y2;
      }
      return {
        yesterday: {
          water: values.weekly.data[6].y,
          heating: values.weekly.data[6].y2,
        },
        today: {
          water: waterDay,
          heating: heatintDay,
          lastWater: values.daily.data[11].y,
          lastHeating: values.daily.data[11].y2,
        }
      };
    });
  }

  setWinterMode(enabled) {
    let newStatus = {
      mode: enabled ? "1" : "0",
    };
    return this.setStatus(newStatus);
  }

  getStatus() {
    let tm = Math.floor(Date.now() / 1000);
    return this.sendGet('https://www.ariston-net.remotethermo.com/PlantDashboard/GetPlantData/' + this.heaterID, {
      zoneNum: '{0}',
      firstRoundTrip: 'true',
      completionToken: this.lastToken,
      twoPhaseRefresh: 'true',
      rnd: tm,
      '&_': tm,
    }).then((values) => {
      this.lastToken = values.completionToken;
      return values;
    });
  }
}

module.exports = AristonApi;

