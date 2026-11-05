/**
 * get-east-asian-width/lookup-data.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: get-east-asian-width@1.5.0..1.6.0
 * pieces: chunk-ngeq6w7y.js (2)
 * attribution: esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-ngeq6w7y.js:4012-4083 esm-fingerprint
function isFullwidthCodePoint(codePoint) {
  return (
    codePoint === 12288 ||
    (codePoint >= 65281 && codePoint <= 65376) ||
    (codePoint >= 65504 && codePoint <= 65510)
  );
}
//@ chunk-ngeq6w7y.js:4083-6354 esm-fingerprint
function isWideCodePoint(codePoint) {
  return (
    (codePoint >= 4352 && codePoint <= 4447) ||
    codePoint === 8986 ||
    codePoint === 8987 ||
    codePoint === 9001 ||
    codePoint === 9002 ||
    (codePoint >= 9193 && codePoint <= 9196) ||
    codePoint === 9200 ||
    codePoint === 9203 ||
    codePoint === 9725 ||
    codePoint === 9726 ||
    codePoint === 9748 ||
    codePoint === 9749 ||
    (codePoint >= 9776 && codePoint <= 9783) ||
    (codePoint >= 9800 && codePoint <= 9811) ||
    codePoint === 9855 ||
    (codePoint >= 9866 && codePoint <= 9871) ||
    codePoint === 9875 ||
    codePoint === 9889 ||
    codePoint === 9898 ||
    codePoint === 9899 ||
    codePoint === 9917 ||
    codePoint === 9918 ||
    codePoint === 9924 ||
    codePoint === 9925 ||
    codePoint === 9934 ||
    codePoint === 9940 ||
    codePoint === 9962 ||
    codePoint === 9970 ||
    codePoint === 9971 ||
    codePoint === 9973 ||
    codePoint === 9978 ||
    codePoint === 9981 ||
    codePoint === 9989 ||
    codePoint === 9994 ||
    codePoint === 9995 ||
    codePoint === 10024 ||
    codePoint === 10060 ||
    codePoint === 10062 ||
    (codePoint >= 10067 && codePoint <= 10069) ||
    codePoint === 10071 ||
    (codePoint >= 10133 && codePoint <= 10135) ||
    codePoint === 10160 ||
    codePoint === 10175 ||
    codePoint === 11035 ||
    codePoint === 11036 ||
    codePoint === 11088 ||
    codePoint === 11093 ||
    (codePoint >= 11904 && codePoint <= 11929) ||
    (codePoint >= 11931 && codePoint <= 12019) ||
    (codePoint >= 12032 && codePoint <= 12245) ||
    (codePoint >= 12272 && codePoint <= 12287) ||
    (codePoint >= 12289 && codePoint <= 12350) ||
    (codePoint >= 12353 && codePoint <= 12438) ||
    (codePoint >= 12441 && codePoint <= 12543) ||
    (codePoint >= 12549 && codePoint <= 12591) ||
    (codePoint >= 12593 && codePoint <= 12686) ||
    (codePoint >= 12688 && codePoint <= 12773) ||
    (codePoint >= 12783 && codePoint <= 12830) ||
    (codePoint >= 12832 && codePoint <= 12871) ||
    (codePoint >= 12880 && codePoint <= 42124) ||
    (codePoint >= 42128 && codePoint <= 42182) ||
    (codePoint >= 43360 && codePoint <= 43388) ||
    (codePoint >= 44032 && codePoint <= 55203) ||
    (codePoint >= 63744 && codePoint <= 64255) ||
    (codePoint >= 65040 && codePoint <= 65049) ||
    (codePoint >= 65072 && codePoint <= 65106) ||
    (codePoint >= 65108 && codePoint <= 65126) ||
    (codePoint >= 65128 && codePoint <= 65131) ||
    (codePoint >= 94176 && codePoint <= 94180) ||
    (codePoint >= 94192 && codePoint <= 94198) ||
    (codePoint >= 94208 && codePoint <= 101589) ||
    (codePoint >= 101631 && codePoint <= 101662) ||
    (codePoint >= 101760 && codePoint <= 101874) ||
    (codePoint >= 110576 && codePoint <= 110579) ||
    (codePoint >= 110581 && codePoint <= 110587) ||
    codePoint === 110589 ||
    codePoint === 110590 ||
    (codePoint >= 110592 && codePoint <= 110882) ||
    codePoint === 110898 ||
    (codePoint >= 110928 && codePoint <= 110930) ||
    codePoint === 110933 ||
    (codePoint >= 110948 && codePoint <= 110951) ||
    (codePoint >= 110960 && codePoint <= 111355) ||
    (codePoint >= 119552 && codePoint <= 119638) ||
    (codePoint >= 119648 && codePoint <= 119670) ||
    codePoint === 126980 ||
    codePoint === 127183 ||
    codePoint === 127374 ||
    (codePoint >= 127377 && codePoint <= 127386) ||
    (codePoint >= 127488 && codePoint <= 127490) ||
    (codePoint >= 127504 && codePoint <= 127547) ||
    (codePoint >= 127552 && codePoint <= 127560) ||
    codePoint === 127568 ||
    codePoint === 127569 ||
    (codePoint >= 127584 && codePoint <= 127589) ||
    (codePoint >= 127744 && codePoint <= 127776) ||
    (codePoint >= 127789 && codePoint <= 127797) ||
    (codePoint >= 127799 && codePoint <= 127868) ||
    (codePoint >= 127870 && codePoint <= 127891) ||
    (codePoint >= 127904 && codePoint <= 127946) ||
    (codePoint >= 127951 && codePoint <= 127955) ||
    (codePoint >= 127968 && codePoint <= 127984) ||
    codePoint === 127988 ||
    (codePoint >= 127992 && codePoint <= 128062) ||
    codePoint === 128064 ||
    (codePoint >= 128066 && codePoint <= 128252) ||
    (codePoint >= 128255 && codePoint <= 128317) ||
    (codePoint >= 128331 && codePoint <= 128334) ||
    (codePoint >= 128336 && codePoint <= 128359) ||
    codePoint === 128378 ||
    codePoint === 128405 ||
    codePoint === 128406 ||
    codePoint === 128420 ||
    (codePoint >= 128507 && codePoint <= 128591) ||
    (codePoint >= 128640 && codePoint <= 128709) ||
    codePoint === 128716 ||
    (codePoint >= 128720 && codePoint <= 128722) ||
    (codePoint >= 128725 && codePoint <= 128728) ||
    (codePoint >= 128732 && codePoint <= 128735) ||
    codePoint === 128747 ||
    codePoint === 128748 ||
    (codePoint >= 128756 && codePoint <= 128764) ||
    (codePoint >= 128992 && codePoint <= 129003) ||
    codePoint === 129008 ||
    (codePoint >= 129292 && codePoint <= 129338) ||
    (codePoint >= 129340 && codePoint <= 129349) ||
    (codePoint >= 129351 && codePoint <= 129535) ||
    (codePoint >= 129648 && codePoint <= 129660) ||
    (codePoint >= 129664 && codePoint <= 129674) ||
    (codePoint >= 129678 && codePoint <= 129734) ||
    codePoint === 129736 ||
    (codePoint >= 129741 && codePoint <= 129756) ||
    (codePoint >= 129759 && codePoint <= 129770) ||
    (codePoint >= 129775 && codePoint <= 129784) ||
    (codePoint >= 131072 && codePoint <= 196605) ||
    (codePoint >= 196608 && codePoint <= 262141)
  );
}
export { isFullwidthCodePoint, isWideCodePoint };
