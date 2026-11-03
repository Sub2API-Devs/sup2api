/**
 * @azure/identity/dist/esm/regionalAuthority.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-mrx6y2r5.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 */

//@ chunk-mrx6y2r5.js:290526-290533 esm-layout
var Rc;
//@ chunk-mrx6y2r5.js:290533-292141 esm-fingerprint
(function (e) {
  ((e.AutoDiscoverRegion = "AutoDiscoverRegion"),
    (e.USWest = "westus"),
    (e.USWest2 = "westus2"),
    (e.USCentral = "centralus"),
    (e.USEast = "eastus"),
    (e.USEast2 = "eastus2"),
    (e.USNorthCentral = "northcentralus"),
    (e.USSouthCentral = "southcentralus"),
    (e.USWestCentral = "westcentralus"),
    (e.CanadaCentral = "canadacentral"),
    (e.CanadaEast = "canadaeast"),
    (e.BrazilSouth = "brazilsouth"),
    (e.EuropeNorth = "northeurope"),
    (e.EuropeWest = "westeurope"),
    (e.UKSouth = "uksouth"),
    (e.UKWest = "ukwest"),
    (e.FranceCentral = "francecentral"),
    (e.FranceSouth = "francesouth"),
    (e.SwitzerlandNorth = "switzerlandnorth"),
    (e.SwitzerlandWest = "switzerlandwest"),
    (e.GermanyNorth = "germanynorth"),
    (e.GermanyWestCentral = "germanywestcentral"),
    (e.NorwayWest = "norwaywest"),
    (e.NorwayEast = "norwayeast"),
    (e.AsiaEast = "eastasia"),
    (e.AsiaSouthEast = "southeastasia"),
    (e.JapanEast = "japaneast"),
    (e.JapanWest = "japanwest"),
    (e.AustraliaEast = "australiaeast"),
    (e.AustraliaSouthEast = "australiasoutheast"),
    (e.AustraliaCentral = "australiacentral"),
    (e.AustraliaCentral2 = "australiacentral2"),
    (e.IndiaCentral = "centralindia"),
    (e.IndiaSouth = "southindia"),
    (e.IndiaWest = "westindia"),
    (e.KoreaSouth = "koreasouth"),
    (e.KoreaCentral = "koreacentral"),
    (e.UAECentral = "uaecentral"),
    (e.UAENorth = "uaenorth"),
    (e.SouthAfricaNorth = "southafricanorth"),
    (e.SouthAfricaWest = "southafricawest"),
    (e.ChinaNorth = "chinanorth"),
    (e.ChinaEast = "chinaeast"),
    (e.ChinaNorth2 = "chinanorth2"),
    (e.ChinaEast2 = "chinaeast2"),
    (e.GermanyCentral = "germanycentral"),
    (e.GermanyNorthEast = "germanynortheast"),
    (e.GovernmentUSVirginia = "usgovvirginia"),
    (e.GovernmentUSIowa = "usgoviowa"),
    (e.GovernmentUSArizona = "usgovarizona"),
    (e.GovernmentUSTexas = "usgovtexas"),
    (e.GovernmentUSDodEast = "usdodeast"),
    (e.GovernmentUSDodCentral = "usdodcentral"));
})(Rc || (Rc = {}));
//@ chunk-mrx6y2r5.js:292141-292419 esm-fingerprint
function Ss(e) {
  var t, r;
  let n = e;
  if (
    n === void 0 &&
    ((r = (t = globalThis.process) === null || t === void 0 ? void 0 : t.env) === null || r === void 0
      ? void 0
      : r.AZURE_REGIONAL_AUTHORITY_NAME) !== void 0
  )
    n = process.env.AZURE_REGIONAL_AUTHORITY_NAME;
  if (n === Rc.AutoDiscoverRegion) return "AUTO_DISCOVER";
  return n;
}

export { Ss };
