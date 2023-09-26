# Overview

**Module Name**: BT Bidder Adapter
**Module Type**: Bidder Adapter  
**Maintainer**: engsupport@blockthrough.com

# Description

The BT Bidder Adapter provides an interface to the BT Service. The BT Bidder Adapter sends one request to the BT Service per ad unit, but the BT Service will then send one request to each configured exchange. This is functionally similar to Prebid Server. One client side request, bids from many exchanges.

The BT service accepts industry standard OpenRTB 2.5 as its payload. The BT Bidder Adapter converts Prebid.js parameters into an OpenRTB 2.5 request.

# Params

- `ab` required, whether AdBlock is enabled.
- `siteId` required, site id.

## AdUnits configuration example

```
    var adUnits = [{
      code: 'your-slot', //use exactly the same code as your slot div id.
      mediaTypes: {
          banner: {
              sizes: [[728, 90]]
          }
      },
      bids: [{
        bidder: 'blockthrough',
        params: {
            ab: true,
            siteId: '12345',
            pubmatic: {
                publisherId: 55555,
              },
      }
      }]
    }];

```
