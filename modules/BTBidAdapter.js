import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { isBoolean, isFn, isStr } from '../src/utils.js';
import { BANNER } from '../src/mediaTypes.js';

const BIDDER_CODE = 'blockthrough';
const GVLID = 815;
const CURRENCY = config.getConfig('currency.adServerCurrency') || 'USD';
const ENDPOINT_URL = 'https://pbs.btloader.com/openrtb2/auction';

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],
  isBidRequestValid: (bid) => {
    return (
      !!bid.params?.siteId &&
      isStr(bid.params.siteId) &&
      !!bid.params?.ab &&
      isBoolean(bid.params.ab)
    );
  },
  buildRequests: (validBidRequests, bidderRequest) => {
    return validBidRequests.map((validBidRequest) => {
      const request = getBTRequest(validBidRequest, bidderRequest);

      return {
        method: 'POST',
        url: ENDPOINT_URL,
        data: JSON.stringify(request),
        bids: validBidRequests,
      };
    });
  },

  interpretResponse: (serverResponse, request) => {
    if (!serverResponse) {
      return [];
    }

    const seatBids = serverResponse?.body.seatbid || [];

    if (!seatBids.length) {
      return [];
    }
    const newBids = seatBids.flatMap((seat) => {
      return seat.bid.map((bid) => {
        const bidResponse = getNewBidResponse(bid);
        bidResponse.btBidderCode = seat.seat;
        return bidResponse;
      });
    });

    return newBids;
  },
};

function getNewBidResponse(bid) {
  return {
    requestId: bid.impid,
    cpm: bid.price,
    currency: bid.currency || CURRENCY,
    width: bid.w || 350,
    height: bid.h || 200,
    ad: bid.adm,
    ttl: bid.ttl || 360,
    creativeId: bid.crid,
    netRevenue: true,
  };
}

function getBTRequest(validBidRequest, bidderRequest) {
  let request = {
    id: validBidRequest.auctionId,
    source: getSource(validBidRequest),
    imp: getImp(validBidRequest),
    device: getDevice(validBidRequest),
    site: getSite(validBidRequest),
    user: getUser(validBidRequest, bidderRequest),
    regs: getRegs(validBidRequest, bidderRequest),
    at: 1,
    ext: getExt(validBidRequest),
  };

  const isDebug = config.getConfig('debug') ? 1 : 0;
  if (isDebug) {
    request.test = isDebug;
  }

  return request;
}

function getImp(validBidRequest) {
  const { params, mediaTypes, bidId, adUnitCode, ortb2Imp } = validBidRequest;
  const { ab, siteId, ...bidderParams } = params;
  const imps = [];

  for (const mediaType in mediaTypes) {
    let bidImp = {
      id: bidId,
      tagid: adUnitCode,
      ab,
      siteId,
      ext: { ...bidderParams },
    };
    const currType = mediaTypes[mediaType];

    const formats = currType.sizes.map(([width, height]) => {
      return { w: width, h: height };
    });

    bidImp[mediaType] = {
      format: formats,
    };

    if (isFn(validBidRequest.getFloor)) {
      const floorInfo = validBidRequest.getFloor({
        currency: CURRENCY,
        mediaType: BANNER,
        size: formats,
      });

      bidImp.bidfloor = floorInfo.floor;
      bidImp.bidfloorcur = floorInfo.currency;
    }

    if (ortb2Imp?.ext.gpid) {
      bidImp.gpid = ortb2Imp.ext.gpid;
    }

    imps.push(bidImp);
  }

  return imps;
}

function getSite(validBidRequest) {
  const { site } = validBidRequest.ortb2 || {};
  if (site) {
    return site;
  }

  const pageURL = config.getConfig('pageUrl');
  if (pageURL) {
    const page = new URL(pageURL);
    const domain = page.host;

    return {
      page,
      domain,
    };
  }
}

function getSource(validBidRequest) {
  const { transactionId, schain } = validBidRequest;
  return {
    tid: transactionId,
    ext: {
      schain,
    },
  };
}

function getDevice(validBidRequest) {
  const { device } = validBidRequest.ortb2 || {};
  if (device) {
    return device;
  }

  const scrapedDevice = config.getConfig('device') || {};
  scrapedDevice.w = scrapedDevice.w || window.innerWidth;
  scrapedDevice.h = scrapedDevice.h || window.innerHeight;
  scrapedDevice.ua = scrapedDevice.ua || navigator.userAgent;
  scrapedDevice.devicetype = detectDevice(scrapedDevice.ua);
  scrapedDevice.language = navigator.languages[1]?.toUpperCase();

  return scrapedDevice;
}

function getUser(validBidRequest, bidderRequest) {
  const user = {
    ext: {
      consent: bidderRequest.gdprConsent?.consentString || '',
    },
  };

  if (validBidRequest.userIdAsEids) {
    user.ext.eids = validBidRequest.userIdAsEids;
  }

  return user;
}

function getRegs(validBidRequest, bidderRequest) {
  const { regs } = validBidRequest.ortb2 || {};
  if (regs) {
    return regs;
  }

  const gdprApplies = bidderRequest.gdprConsent?.gdprApplies;
  return {
    ext: {
      gdpr: gdprApplies ? 1 : 0,
      us_privacy: bidderRequest.uspConsent,
    },
    gpp: bidderRequest.gppConsent?.gppString,
    gpp_sid: bidderRequest.gppConsent?.applicableSections,
  };
}

function getExt(validBidRequest) {
  const { ext } = validBidRequest.ortb2Imp || {};
  if (ext) {
    return ext;
  }

  return { ssl: 1 };
}

function detectDevice(userAgent) {
  if (
    /mobile/i.test(userAgent) ||
    /android|webos|iphone|ipod|blackberry|iemobile|windows phone|opera mini/i.test(
      userAgent
    ) ||
    (/ucbrowser/i.test(userAgent) && window.ucweb)
  ) {
    return 'mobile';
  }

  if (/Windows NT|Macintosh|Linux|X11/i.test(userAgent)) {
    return 'pc';
  }
}

registerBidder(spec);
