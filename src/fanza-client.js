const API_URL = 'https://api.video.dmm.co.jp/graphql';

const CONTENT_FIELDS = `
  id title deliveryStartAt contentType
  maker { name }
  actresses { id name }
  packageImage { largeUrl }
  review { average count }
  bookmarkCount
`;

async function gql(query, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (res.status === 429) {
        const wait = Math.min(1000 * 2 ** attempt, 10000);
        console.warn(`[FANZA] Rate limited, retrying in ${wait}ms...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      if (data.errors) {
        throw new Error(`GraphQL error: ${data.errors[0].message}`);
      }
      return data.data;
    } catch (err) {
      if (attempt === retries) throw err;
      const wait = Math.min(1000 * 2 ** attempt, 10000);
      console.warn(`[FANZA] Attempt ${attempt} failed: ${err.message}, retrying in ${wait}ms...`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

function extractResults(data) {
  const result = data.legacySearchPPV.result;
  return {
    contents: result.contents,
    totalCount: result.pageInfo.totalCount,
  };
}

export async function fetchTodayReleases(date, limit = 20, offset = 0) {
  const data = await gql(`{
    legacySearchPPV(
      limit: ${limit},
      offset: ${offset},
      sort: DELIVERY_START_DATE,
      floor: AV,
      filter: { deliveryStartDate: "${date}" }
    ) {
      result {
        contents { ${CONTENT_FIELDS} }
        pageInfo { totalCount }
      }
    }
  }`);
  return extractResults(data);
}

export async function fetchByActress(actressId, limit = 20) {
  const data = await gql(`{
    legacySearchPPV(
      limit: ${limit},
      sort: DELIVERY_START_DATE,
      floor: AV,
      filter: { actressIds: ["${actressId}"] }
    ) {
      result {
        contents { ${CONTENT_FIELDS} }
        pageInfo { totalCount }
      }
    }
  }`);
  return extractResults(data);
}

export async function fetchRanking(sortType, limit = 10) {
  const sortMap = {
    sales: 'SALES_RANK_SCORE',
    review: 'REVIEW_RANK_SCORE',
    bookmark: 'BOOKMARK_COUNT',
  };
  const sort = sortMap[sortType] || sortType;

  const data = await gql(`{
    legacySearchPPV(
      limit: ${limit},
      sort: ${sort},
      floor: AV
    ) {
      result {
        contents { ${CONTENT_FIELDS} }
        pageInfo { totalCount }
      }
    }
  }`);
  return extractResults(data);
}

export async function fetchTodayHot(date, limit = 20, offset = 0) {
  const data = await gql(`{
    legacySearchPPV(
      limit: ${limit},
      offset: ${offset},
      sort: SALES_RANK_SCORE,
      floor: AV,
      filter: { deliveryStartDate: "${date}" }
    ) {
      result {
        contents { ${CONTENT_FIELDS} }
        pageInfo { totalCount }
      }
    }
  }`);
  return extractResults(data);
}

export async function searchByKeyword(keyword, limit = 20, offset = 0) {
  const result = await rawSearch(keyword, limit, offset);

  // If no results and keyword has no spaces, try inserting a space between every 2 chars
  if (result.totalCount === 0 && offset === 0 && !keyword.includes(' ') && keyword.length >= 3) {
    // Try splitting: "蒼井空" → "蒼井 空"
    for (let i = 2; i < keyword.length; i++) {
      const spaced = keyword.slice(0, i) + ' ' + keyword.slice(i);
      const retry = await rawSearch(spaced, limit, 0);
      if (retry.totalCount > 0) return retry;
    }
  }

  return result;
}

async function rawSearch(keyword, limit, offset) {
  const escaped = keyword.replace(/"/g, '\\"');
  const data = await gql(`{
    legacySearchPPV(
      limit: ${limit},
      offset: ${offset},
      sort: SALES_RANK_SCORE,
      floor: AV,
      queryWord: "${escaped}"
    ) {
      result {
        contents { ${CONTENT_FIELDS} }
        pageInfo { totalCount }
      }
    }
  }`);
  return extractResults(data);
}

export async function searchActress(name) {
  const result = await searchByKeyword(name, 10);
  const actressMap = new Map();

  for (const content of result.contents) {
    for (const actress of content.actresses) {
      if (actress.name.includes(name) && !actressMap.has(actress.id)) {
        actressMap.set(actress.id, actress);
      }
    }
  }

  return {
    actresses: [...actressMap.values()],
    contents: result.contents,
    totalCount: result.totalCount,
  };
}

export async function fetchRandom() {
  // Step 1: get totalCount with limit=0
  const countData = await gql(`{
    legacySearchPPV(
      limit: 1,
      offset: 0,
      sort: DELIVERY_START_DATE,
      floor: AV
    ) {
      result {
        pageInfo { totalCount }
      }
    }
  }`);
  const total = countData.legacySearchPPV.result.pageInfo.totalCount;
  if (total === 0) return { contents: [], totalCount: 0 };

  // Step 2: random offset (API caps at 50000), fetch 1 result
  const maxOffset = Math.min(total - 1, 50000);
  const offset = Math.floor(Math.random() * (maxOffset + 1));
  const data = await gql(`{
    legacySearchPPV(
      limit: 1,
      offset: ${offset},
      sort: DELIVERY_START_DATE,
      floor: AV
    ) {
      result {
        contents { ${CONTENT_FIELDS} }
        pageInfo { totalCount }
      }
    }
  }`);
  return extractResults(data);
}

export function getTodayJST() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}
