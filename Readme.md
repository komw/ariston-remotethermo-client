# Ariston Remotethermo Client

  [![NPM Version][npm-image]][npm-url]
  [![NPM Downloads][downloads-image]][downloads-url]
  
  
This package provides a client for [Ariston remotethermo panel](https://www.ariston-net.remotethermo.com) (Ariston Net, Ariston Bus Bridgenet® control website).

Is uses WEB Api to control Ariston Heaters.
I'm only tested it with my Ariston Genus One Net boiler, but it should work with any boiler which uses Cube Net S or Sensys Thermostat.
Perhaps it also should work with similar Ariston like boilers/heaters like Chaffeatux etc.

## Limitations
There is a few limitation due to problems with connecting to Ariston RemoteThermo API. Sending many requests at the same time causes a Cube Net S disconnetion. It that case you will need to wait few seconds to Cube Net S reconnect with RemoteThermo servers (or it need somethimes to restart).
Library uses a requestretry under the hood, but it only solves a few problems.

## Installation


This is a [Node.js](https://nodejs.org/en/) module available through the
[npm registry](https://www.npmjs.com/).


Installation is done using the
[`npm install` command](https://docs.npmjs.com/getting-started/installing-npm-packages-locally):

```bash
$ npm install ariston-remotethermo-client
```

## Features

  * Login
  * Enable/Disable comfort mode
  * Enable/Disable winter mode
  * Get params:
    * target temperature
    * flame presence
    * outdoor temperature
    * holiday mode
    * room temperature
    * overwriten temperature
    * overwriten temperature Until
    * winter mode
    * comfort mode
    * get gas usage
    * many others params

## Usage configuration
You need to specify a:
* LOGIN
* PASSWORD

to your account at https://www.ariston-net.remotethermo.com
also you need to specify a HEATER_ID which you can easily find after login into https://www.ariston-net.remotethermo.com :
HEATER_ID you can find as a part of URL after login:
`https://www.ariston-net.remotethermo.com/PlantDashboard/Index/HEATER_ID`

## Usage Example:
```js
const AristonApi = require("ariston-remotethermo-client");
const ariston = new AristonApi("LOGIN", "PASSWORD", "HEATER_ID");

ariston.login().then(() => {
  ariston.getStatus().then((params) => {
    console.log("Comfort Temperature:", params.zone.comfortTemp.value);
    console.log("Outdoor Temperature:", params.outsideTemp);
    console.log("Room Temperature:", params.zone.roomTemp);
    ariston.getComfortStatus().then((value) => {
      console.log("Comfort mode:", value);
      ariston.setComfortStatus(3).then((newState) => {
        console.log("Comfort mode:", newState);
      });
    });

  });
});
```

## Disclaimer
All information posted is merely for educational and informational purposes. It is not intended as a substitute for professional advice. Should you decide to act upon any information on this website, you do so at your own risk.
While the information on this website has been verified to the best of our abilities, I cannot guarantee that there are no mistakes or errors.
You may use this library with the understanding that doing so is AT YOUR OWN RISK. No warranty, express or implied, is made with regards to the fitness or safety of this code for any purpose. If you use this library to query or change settings of your products you understand that it is possible to cause damages
I reserve the right to change this policy at any given time. 
## License

  [MIT](LICENSE)


[npm-url]: https://npmjs.org/package/ariston-remotethermo-client
[npm-image]: https://img.shields.io/npm/v/ariston-remotethermo-client.svg
[downloads-image]: https://img.shields.io/npm/dm/ariston-remotethermo-client.svg
[downloads-url]: https://npmjs.org/package/ariston-remotethermo-client
