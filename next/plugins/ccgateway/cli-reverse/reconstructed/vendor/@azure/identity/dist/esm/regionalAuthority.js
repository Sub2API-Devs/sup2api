/**
 * @azure/identity/dist/esm/regionalAuthority.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-b5df2wx1.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 */

//@ chunk-b5df2wx1.js:290526-290533 esm-layout
var RegionalAuthority;
//@ chunk-b5df2wx1.js:290533-292141 esm-fingerprint
(function (RegionalAuthority) {
  RegionalAuthority.AutoDiscoverRegion = "AutoDiscoverRegion";
  RegionalAuthority.USWest = "westus";
  RegionalAuthority.USWest2 = "westus2";
  RegionalAuthority.USCentral = "centralus";
  RegionalAuthority.USEast = "eastus";
  RegionalAuthority.USEast2 = "eastus2";
  RegionalAuthority.USNorthCentral = "northcentralus";
  RegionalAuthority.USSouthCentral = "southcentralus";
  RegionalAuthority.USWestCentral = "westcentralus";
  RegionalAuthority.CanadaCentral = "canadacentral";
  RegionalAuthority.CanadaEast = "canadaeast";
  RegionalAuthority.BrazilSouth = "brazilsouth";
  RegionalAuthority.EuropeNorth = "northeurope";
  RegionalAuthority.EuropeWest = "westeurope";
  RegionalAuthority.UKSouth = "uksouth";
  RegionalAuthority.UKWest = "ukwest";
  RegionalAuthority.FranceCentral = "francecentral";
  RegionalAuthority.FranceSouth = "francesouth";
  RegionalAuthority.SwitzerlandNorth = "switzerlandnorth";
  RegionalAuthority.SwitzerlandWest = "switzerlandwest";
  RegionalAuthority.GermanyNorth = "germanynorth";
  RegionalAuthority.GermanyWestCentral = "germanywestcentral";
  RegionalAuthority.NorwayWest = "norwaywest";
  RegionalAuthority.NorwayEast = "norwayeast";
  RegionalAuthority.AsiaEast = "eastasia";
  RegionalAuthority.AsiaSouthEast = "southeastasia";
  RegionalAuthority.JapanEast = "japaneast";
  RegionalAuthority.JapanWest = "japanwest";
  RegionalAuthority.AustraliaEast = "australiaeast";
  RegionalAuthority.AustraliaSouthEast = "australiasoutheast";
  RegionalAuthority.AustraliaCentral = "australiacentral";
  RegionalAuthority.AustraliaCentral2 = "australiacentral2";
  RegionalAuthority.IndiaCentral = "centralindia";
  RegionalAuthority.IndiaSouth = "southindia";
  RegionalAuthority.IndiaWest = "westindia";
  RegionalAuthority.KoreaSouth = "koreasouth";
  RegionalAuthority.KoreaCentral = "koreacentral";
  RegionalAuthority.UAECentral = "uaecentral";
  RegionalAuthority.UAENorth = "uaenorth";
  RegionalAuthority.SouthAfricaNorth = "southafricanorth";
  RegionalAuthority.SouthAfricaWest = "southafricawest";
  RegionalAuthority.ChinaNorth = "chinanorth";
  RegionalAuthority.ChinaEast = "chinaeast";
  RegionalAuthority.ChinaNorth2 = "chinanorth2";
  RegionalAuthority.ChinaEast2 = "chinaeast2";
  RegionalAuthority.GermanyCentral = "germanycentral";
  RegionalAuthority.GermanyNorthEast = "germanynortheast";
  RegionalAuthority.GovernmentUSVirginia = "usgovvirginia";
  RegionalAuthority.GovernmentUSIowa = "usgoviowa";
  RegionalAuthority.GovernmentUSArizona = "usgovarizona";
  RegionalAuthority.GovernmentUSTexas = "usgovtexas";
  RegionalAuthority.GovernmentUSDodEast = "usdodeast";
  RegionalAuthority.GovernmentUSDodCentral = "usdodcentral";
})(RegionalAuthority || (RegionalAuthority = {}));
//@ chunk-b5df2wx1.js:292141-292419 esm-fingerprint
function calculateRegionalAuthority(regionalAuthority) {
  var _a;
  var _b;
  let azureRegion = regionalAuthority;
  if (
    azureRegion === undefined &&
    ((_b = (_a = globalThis.process) === null || _a === undefined ? undefined : _a.env) === null ||
    _b === undefined
      ? undefined
      : _b.AZURE_REGIONAL_AUTHORITY_NAME) !== undefined
  )
    azureRegion = process.env.AZURE_REGIONAL_AUTHORITY_NAME;
  if (azureRegion === RegionalAuthority.AutoDiscoverRegion) return "AUTO_DISCOVER";
  return azureRegion;
}
export { calculateRegionalAuthority };
