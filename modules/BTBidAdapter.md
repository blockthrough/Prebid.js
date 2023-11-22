# Overview

**Module Name**: BT Bidder Adapter
**Module Type**: Bidder Adapter  
**Maintainer**: engsupport@blockthrough.com

# Description

The BT Bidder Adapter provides an interface to the BT Service. The BT Bidder Adapter sends one request to the BT Service per ad unit. Behind the scenes, the BT Service further disperses requests to various configured exchanges. This operational model closely resembles that of Prebid Server, where a single request is made from the client side, and responses are gathered from multiple exchanges.

# Bid Params

| Key                    | Scope    | Type    | Description                                                    |
| ---------------------- | -------- | ------- | -------------------------------------------------------------- |
| blockthrough.ab        | Required | Boolean | Whether AdBlock is enabled.                                    |
| blockthrough.orgID     | Required | String  | Unique org ID.                                                 |
| blockthrough.websiteID | Required | String  | Unique site ID.                                                |
| bidder                 | Required | Object  | Bidder configuration. Could configure several bidders this way |

## AdUnits configuration example

```
    var adUnits = [{
      code: 'banner-div-1',
      mediaTypes: {
          banner: {
              sizes: [[728, 90]]
          }
      },
      bids: [{
        bidder: 'blockthrough',
        params: {
            blockthrough: {
              ab: false,
              orgID: 'orgID',
              websiteID: 'websiteID',
            },
            bidderA: {
                publisherId: 55555,
            },
            bidderB: {
              zoneId: 12,
            }
      }
      }]
    }];

```
