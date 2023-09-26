import { expect } from 'chai';
import { spec } from 'modules/BTBidAdapter.js';
import { config } from '../../../src/config.js';
import { deepAccess } from '../../../src/utils.js';

describe('BT Bid Adapter', () => {
  let sandbox;
  const ENDPOINT_URL = 'https://pbs.btloader.com/openrtb2/auction';

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

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
      const bidderRequest = {
        auctionId: 12345,
        bidderCode: 'blockthrough',
        bidderRequestId: '12345',
        bids: [
          {
            adUnitCode: 'leaderboard',
            auctionId: 'test12345',
            bidId: 'bid12345',
            bidder: 'blockthrough',
            getFloor: ({ currency, mediaType, size }) => {
              return { floor: 0.03, currency: 'USD' };
            },
            mediaTypes: {
              banner: { sizes: [[728, 90]] },
            },
            ortb2: {
              regs: {
                ext: { us_privacy: 'uspString' },
              },
              device: {
                w: 1920,
                h: 1280,
                ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
                language: 'en',
              },
              site: {
                domain: 'test.com',
                page: 'https://www.test.com/',
                publisher: {
                  domain: 'test.com',
                },
              },
            },
            ortb2Imp: {
              ext: {
                tid: '12345',
              },
            },
            params: {
              ab: true,
              siteId: '1234567',
              pubmatic: {
                publisherId: '111111',
              },
            },
            schain: {
              ver: '1.0',
              complete: 1,
              nodes: [{ asi: 'test.com', sid: '1234567', hp: 1 }],
            },
            transactionId: '111111',
            userIdAsEids: [{ source: 'test.com', uids: [{ id: '11111' }] }],
          },
        ],
        uspConsent: 'uspString',
        gdprConsent: {
          gdprApplies: 1,
          consentString: 'gdprString',
        },
        gppConsent: {
          gppString: 'gppString',
          fullGppData: {},
          applicableSections: [7],
        },
      };
      const validBidRequests = [
        {
          adUnitCode: 'leaderboard',
          auctionId: 'test12345',
          bidId: 'bid12345',
          bidder: 'blockthrough',
          getFloor: ({ currency, mediaType, size }) => {
            return { floor: 0.03, currency: 'USD' };
          },
          mediaTypes: {
            banner: { sizes: [[728, 90]] },
          },
          ortb2: {
            regs: {
              ext: { us_privacy: 'uspString' },
            },
            device: {
              w: 1920,
              h: 1280,
              ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
              language: 'en',
            },
            site: {
              domain: 'test.com',
              page: 'https://www.test.com/',
              publisher: {
                domain: 'test.com',
              },
            },
          },
          ortb2Imp: {
            ext: {
              tid: '12345',
              gpid: 'path/leaderboard',
            },
          },
          params: {
            ab: true,
            siteId: '1234567',
            pubmatic: {
              publisherId: '111111',
            },
          },
          schain: {
            ver: '1.0',
            complete: 1,
            nodes: [{ asi: 'test.com', sid: '1234567', hp: 1 }],
          },
          transactionId: '111111',
          userIdAsEids: [{ source: 'test.com', uids: [{ id: '11111' }] }],
        },
      ];

      const expectedData = JSON.stringify({
        id: 'test12345',
        source: {
          tid: '111111',
          ext: {
            schain: {
              ver: '1.0',
              complete: 1,
              nodes: [{ asi: 'test.com', sid: '1234567', hp: 1 }],
            },
          },
        },
        imp: [
          {
            id: 'bid12345',
            tagid: 'leaderboard',
            ab: true,
            siteId: '1234567',
            ext: { pubmatic: { publisherId: '111111' } },
            banner: { format: [{ w: 728, h: 90 }] },
            bidfloor: 0.03,
            bidfloorcur: 'USD',
            gpid: 'path/leaderboard',
          },
        ],
        device: {
          w: 1920,
          h: 1280,
          ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
          language: 'en',
        },
        site: {
          domain: 'test.com',
          page: 'https://www.test.com/',
          publisher: { domain: 'test.com' },
        },
        user: {
          ext: {
            consent: 'gdprString',
            eids: [{ source: 'test.com', uids: [{ id: '11111' }] }],
          },
        },
        regs: { ext: { us_privacy: 'uspString' } },
        at: 1,
        ext: { tid: '12345', gpid: 'path/leaderboard' },
      });

      const requests = spec.buildRequests(validBidRequests, bidderRequest);

      expect(requests).to.be.an('array');
      expect(requests).to.have.lengthOf(validBidRequests.length);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal(ENDPOINT_URL);
      expect(requests[0].data).to.equal(expectedData);
      expect(requests[0].bids).to.equal(validBidRequests);
    });

    it('should build post request ortb2 fields are not present', () => {
      const bidderRequest = {
        auctionId: 12345,
        bidderCode: 'blockthrough',
        bidderRequestId: '12345',
        bids: [
          {
            adUnitCode: 'leaderboard',
            auctionId: 'test12345',
            bidId: 'bid12345',
            bidder: 'blockthrough',
            getFloor: ({ currency, mediaType, size }) => {
              return { floor: 0.03, currency: 'USD' };
            },
            mediaTypes: {
              banner: { sizes: [[728, 90]] },
            },
            params: {
              ab: true,
              siteId: '1234567',
              pubmatic: {
                publisherId: '111111',
              },
            },
            schain: {
              ver: '1.0',
              complete: 1,
              nodes: [{ asi: 'test.com', sid: '1234567', hp: 1 }],
            },
            transactionId: '111111',
            userIdAsEids: [{ source: 'test.com', uids: [{ id: '11111' }] }],
          },
        ],
        uspConsent: 'uspString',
        gdprConsent: {
          gdprApplies: 1,
          consentString: 'gdprString',
        },
        gppConsent: {
          gppString: 'gppString',
          fullGppData: {},
          applicableSections: [7],
        },
      };
      const validBidRequests = [
        {
          adUnitCode: 'leaderboard',
          auctionId: 'test12345',
          bidId: 'bid12345',
          bidder: 'blockthrough',
          getFloor: ({ currency, mediaType, size }) => {
            return { floor: 0.03, currency: 'USD' };
          },
          mediaTypes: {
            banner: { sizes: [[728, 90]] },
          },
          params: {
            ab: true,
            siteId: '1234567',
            pubmatic: {
              publisherId: '111111',
            },
          },
          schain: {
            ver: '1.0',
            complete: 1,
            nodes: [{ asi: 'test.com', sid: '1234567', hp: 1 }],
          },
          transactionId: '111111',
          userIdAsEids: [{ source: 'test.com', uids: [{ id: '11111' }] }],
        },
      ];

      const expectedData = JSON.stringify({
        id: 'test12345',
        source: {
          tid: '111111',
          ext: {
            schain: {
              ver: '1.0',
              complete: 1,
              nodes: [{ asi: 'test.com', sid: '1234567', hp: 1 }],
            },
          },
        },
        imp: [
          {
            id: 'bid12345',
            tagid: 'leaderboard',
            ab: true,
            siteId: '1234567',
            ext: { pubmatic: { publisherId: '111111' } },
            banner: { format: [{ w: 728, h: 90 }] },
            bidfloor: 0.03,
            bidfloorcur: 'USD',
          },
        ],
        device: {
          w: 785,
          h: 600,
          ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/117.0.5938.92 Safari/537.36',
          devicetype: 'pc',
        },
        site: { page: 'https://test.com/', domain: 'test.com' },
        user: {
          ext: {
            consent: 'gdprString',
            eids: [{ source: 'test.com', uids: [{ id: '11111' }] }],
          },
        },
        regs: {
          ext: { gdpr: 1, us_privacy: 'uspString' },
          gpp: 'gppString',
          gpp_sid: [7],
        },
        at: 1,
        ext: { ssl: 1 },
        test: 1,
      });

      sandbox.stub(config, 'getConfig').callsFake((key) => {
        const config = {
          debug: true,
          pageUrl: 'https://test.com/',
        };
        return deepAccess(config, key);
      });

      const requests = spec.buildRequests(validBidRequests, bidderRequest);

      expect(requests).to.be.an('array');
      expect(requests).to.have.lengthOf(validBidRequests.length);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal(ENDPOINT_URL);
      expect(requests[0].data).to.equal(expectedData);
      expect(requests[0].bids).to.equal(validBidRequests);
    });
  });

  describe('interpretResponse', () => {
    it('should return empty array if serverResponse is not defined', () => {
      const bids = spec.interpretResponse(undefined, {});

      expect(bids.length).to.equal(0);
    });

    it('should return empty array if seatbid array is empty', () => {
      const serverResponse = {
        body: {
          seatbid: [],
        },
      };

      const bids = spec.interpretResponse(serverResponse, {});

      expect(bids.length).to.equal(0);
    });

    it('should return bids array', () => {
      const serverResponse = {
        body: {
          cur: 'USD',
          id: '11111',
          seatbid: [
            {
              bid: [
                {
                  adm: "<img src='https://www.addomain.com/ae123'></img>",
                  crid: '55555',
                  currency: 'USD',
                  price: 1.0,
                  w: 728,
                  h: 90,
                  ttl: 280,
                  impid: '11111',
                },
              ],
              seat: '1234',
            },
          ],
        },
      };

      const expectedBid = {
        requestId: '11111',
        cpm: 1.0,
        currency: 'USD',
        width: 728,
        height: 90,
        ad: "<img src='https://www.addomain.com/ae123'></img>",
        ttl: 280,
        creativeId: '55555',
        netRevenue: true,
        btBidderCode: '1234',
      };

      const bids = spec.interpretResponse(serverResponse, {});

      expect(bids.length).to.equal(1);
      expect(bids[0]).to.deep.equal(expectedBid);
    });
  });
});
