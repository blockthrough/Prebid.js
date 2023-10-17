import { expect } from 'chai';
import { spec } from 'modules/BTBidAdapter.js';
import { BANNER } from '../../../src/mediaTypes.js';
// load modules that register ORTB processors
import 'src/prebid.js';
import 'modules/currency.js';
import 'modules/userId/index.js';
import 'modules/multibid/index.js';
import 'modules/priceFloors.js';
import 'modules/consentManagement.js';
import 'modules/consentManagementUsp.js';
import 'modules/consentManagementGpp.js';
import 'modules/enrichmentFpdModule.js';
import 'modules/gdprEnforcement.js';
import 'modules/gppControl_usnat.js';
import 'modules/schain.js';

describe('BT Bid Adapter', () => {
  const ENDPOINT_URL = 'https://pbs.btloader.com/openrtb2/auction';
  const validBidRequests = [
    {
      bidId: '2e9f38ea93bb9e',
      bidder: 'blockthrough',
      adUnitCode: 'adunit-code',
      mediaTypes: { [BANNER]: { sizes: [[300, 250]] } },
      params: {
        ab: true,
        siteId: '55555',
        bidderA: {
          pubId: '11111',
        },
      },
      bidderRequestId: 'test-bidder-request-id',
      auctionId: 'test-auction-id',
    },
  ];
  const bidderRequest = {
    auctionId: 'test-auction-id',
    bidderCode: 'blockthrough',
    bidderRequestId: 'test-bidder-request-id',
    bids: validBidRequests,
  };

  describe('isBidRequestValid', function () {
    it('should validate bid request with valid params', () => {
      const validBid = {
        params: {
          ab: true,
          siteId: 'exampleSiteId',
          pubmatic: {
            publisherId: 55555,
          },
        },
        sizes: [[300, 250]],
        bidId: '123',
        adUnitCode: 'leaderboard',
      };

      const isValid = spec.isBidRequestValid(validBid);

      expect(isValid).to.be.true;
    });

    it('should not validate bid request with invalid params', () => {
      const invalidBid = {
        params: {},
        sizes: [[300, 250]],
        bidId: '123',
        adUnitCode: 'leaderboard',
      };

      const isValid = spec.isBidRequestValid(invalidBid);

      expect(isValid).to.be.false;
    });
  });

  describe('buildRequests', () => {
    it('should build post request when ortb2 fields are present', () => {
      const bidderParams = {
        bidderA: {
          pubId: '11111',
        },
      };

      const requests = spec.buildRequests(validBidRequests, bidderRequest);

      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal(ENDPOINT_URL);
      expect(requests[0].data).to.exist;
      expect(requests[0].data.imp[0].ext).to.deep.equal(bidderParams);
      expect(requests[0].data.site.ext.blockthrough.ab).to.be.true;
      expect(requests[0].data.site.ext.blockthrough.siteId).to.equal('55555');
    });
  });

  describe('interpretResponse', () => {
    it('should return empty array if serverResponse is not defined', () => {
      const bidRequest = spec.buildRequests(validBidRequests, bidderRequest);
      const bids = spec.interpretResponse(undefined, bidRequest);

      expect(bids.length).to.equal(0);
    });

    it('should return bids array when serverResponse is defined and seatbid array is not empty', () => {
      const bidResponse = {
        body: {
          id: 'bid-response',
          cur: 'USD',
          seatbid: [
            {
              bid: [
                {
                  impid: '2e9f38ea93bb9e',
                  crid: 'creative-id',
                  cur: 'USD',
                  price: 9,
                  price: 2,
                  w: 300,
                  h: 250,
                  mtype: 1,
                  adomain: ['test.com'],
                },
              ],
            },
          ],
        },
      };

      const expectedBids = [
        {
          cpm: 2,
          creativeId: 'creative-id',
          creative_id: 'creative-id',
          currency: 'USD',
          height: 250,
          mediaType: 'banner',
          meta: {
            advertiserDomains: ['test.com'],
          },
          netRevenue: true,
          requestId: '2e9f38ea93bb9e',
          ttl: 30,
          width: 300,
        },
      ];

      const request = spec.buildRequests(validBidRequests, bidderRequest)[0];
      const bids = spec.interpretResponse(bidResponse, request);

      expect(bids).to.deep.equal(expectedBids);
    });
  });
});
