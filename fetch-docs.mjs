import { FetchClient, Config } from 'coze-coding-dev-sdk';

async function fetchDocuments() {
  const config = new Config();
  const client = new FetchClient(config);

  const urls = [
    'https://coze-coding-project.tos.coze.site/create_attachment/2026-03-29/3440814336770272_38d2bc2e7611ba28998c9b778d6d488d_%F0%9F%93%84%20Link2Global%20%E8%B7%A8%E5%A2%83%E7%94%B5%E5%95%86%E8%87%AA%E5%8A%A8%E5%8C%96%E4%B8%8A%E6%9E%B6%E7%B3%BB%E7%BB%9F%20PRD%EF%BC%88%E4%BC%98%E5%8C%96%E5%AE%9A%E7%A8%BF%20V1.1%EF%BC%89.1%EF%BC%89?sign=4896859258-56dce65b63-0-52a66b8df4c403067b3f26081409a9f90fb44f3733d2fdb138021ca922127f48',
    'https://coze-coding-project.tos.coze.site/create_attachment/2026-03-29/3440814336770272_ea7482771e2dcd3a9e28ceb0990a4cc2_Link2Global%20%E8%B7%A8%E5%A2%83%E7%94%B5%E5%95%86%E8%87%AA%E5%8A%A8%E5%8C%96%E4%B8%8A%E6%9E%B6%E7%B3%BB%E7%BB%9F%20-%20%E5%8E%9F%E5%9E%8B%E6%96%87%E6%A1%A3%EF%BC%88V1.1%EF%BC%89.md?sign=4896859258-6fd9902c01-0-216f449b834ec960af9ca9f0e1df30a31186a0dc84c700933bf01bc715a0331d'
  ];

  for (let i = 0; i < urls.length; i++) {
    console.log(`\n=== Document ${i + 1} ===\n`);
    try {
      const response = await client.fetch(urls[i]);
      console.log(`Title: ${response.title}`);
      console.log(`Status: ${response.status_code}`);
      
      for (const item of response.content) {
        if (item.type === 'text') {
          console.log(item.text);
        }
      }
    } catch (error) {
      console.error(`Error fetching document ${i + 1}:`, error.message);
    }
  }
}

fetchDocuments();
