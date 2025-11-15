// ==UserScript==
// @name         NHentai Web Clipper for Obsidian
// @namespace    https://nhentai.net
// @version      v1.0.12.20251115
// @description  🔞 A user script that exports NHentai gallery metadata as Obsidian Markdown files (Obsidian NHentai Web Clipper).
// @author       abc202306
// @match        https://nhentai.net/g/*
// @icon         none
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // Entry point
  setTimeout(startNHentaiWebclipper, 2000);

  function startNHentaiWebclipper() {
    const data = getData();
    const fileContent = getFileContent(data);
    const obsidianURI = getObsidianURI(data.title, fileContent);

    if (confirm("NHentai Web Clipper for Obsidian (a tampermonkey user script by abc202306) says:\n\nDo you want to proceed to clip the nhentai gallery metadata as a obsidian markdown note (by obsidian uri protocol api)?\n\nclick 'OK' to proceed, or 'Cancel' to abort.")) {
      window.location.href = obsidianURI;
    }
  }

  // Build Obsidian URI
  function getObsidianURI(title, fileContent) {
    const params = [
      ["file", `acg/galleries/${title}`],
      ["content", fileContent],
      ["append", "1"]
    ].map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");

    return `obsidian://new?${params};`;
  }

  // Extract metadata from page
  function getData() {
    const info = document.querySelector("#info");
    const titles = info.querySelectorAll(".title");

    const now = getLocalISOStringWithTimezone();

    const titleEN = getTitleStr(titles[0]);
    const titleJP = getTitleStr(titles[1]);

    const data = {
      title: sanitizeTitle(titleJP || titleEN),
      english: titleEN,
      japanese: titleJP,
      url: `https://nhentai.net/g/${info.querySelector("#gallery_id").innerText.slice(1)}`,
      cover: document.querySelector("#cover img").src,
      parody: [],
      character: [],
      keywords: [],
      artist: [],
      group: [],
      language: [],
      categories: [],
      pagecount: null,
      uploaded: null,
      ctime: now,
      mtime: now,
      unindexedData: {}
    };

    const keyMap = {
      Parodies: "parody",
      Characters: "character",
      Tags: "keywords",
      Artists: "artist",
      Groups: "group",
      Languages: "language",
      Categories: "categories"
    };

    info.querySelectorAll("#tags > div.tag-container").forEach(tagGroupCon => {
      const groupName = getTagGroupName(tagGroupCon);
      if (groupName === "Uploaded") {
        data.uploaded = tagGroupCon.querySelector("time").dateTime;
      } else if (groupName === "Pages") {
        data.pagecount = getTagName(tagGroupCon.querySelector(".name"));
      } else if (keyMap[groupName]) {
        data[keyMap[groupName]] = [...tagGroupCon.querySelectorAll(".name")]
          .map(el => `[[${getTagName(el)}]]`);
      } else {
        data.unindexedData[groupName.toLowerCase().replaceAll(/\s/,"")] = [...tagGroupCon.querySelectorAll(".name")]
          .map(el => `[[${getTagName(el)}]]`);
      }
    });

    return data;
  }   

  function getUnindexedDataFrontMatterPartStrBlock(unindexedData) {
    let unindexedDataFrontMatterPartStrBlock = '';
    Object.entries(unindexedData).forEach(([key,value]) => {
      if (Array.isArray(value)) {
        unindexedDataFrontMatterPartStrBlock += `\n${key}:${getYamlArrayStr(value)}`;
      } else {
        unindexedDataFrontMatterPartStrBlock += `\n${key}: "${value}"`;
      }
    });
    return unindexedDataFrontMatterPartStrBlock;
  }

  function getUnindexedDataTablePartStrBlock(unindexedData) {
    let unindexedDataTablePartStrBlock = '';
    Object.entries(unindexedData).forEach(([key,value]) => {
      if (Array.isArray(value)) {
        unindexedDataTablePartStrBlock += `\n| ${key} | ${value.join(", ")} |`;
      } else {
        unindexedDataTablePartStrBlock += `\n| ${key} | ${value} |`;
      }
    });
    return unindexedDataTablePartStrBlock;
  }

  // Build Obsidian note content
  function getFileContent(data) {
    const escapePipe = str => str.replace(/\|/g, "\\|");

    return `---
up:
  - "[[Gallery]]"
categories:${getYamlArrayStr(data.categories)}
keywords:${getYamlArrayStr(data.keywords)}
english: "${data.english}"
japanese: "${data.japanese}"
url: "${data.url}"
artist:${getYamlArrayStr(data.artist)}
group:${getYamlArrayStr(data.group)}
parody:${getYamlArrayStr(data.parody)}
character:${getYamlArrayStr(data.character)}
language:${getYamlArrayStr(data.language)}
pagecount: ${data.pagecount}
cover: "${data.cover}"
uploaded: ${data.uploaded}
ctime: ${data.ctime}
mtime: ${data.mtime}${getUnindexedDataFrontMatterPartStrBlock(data.unindexedData)}
---

# ${data.title}

![200](${data.cover})

| | |
| --- | --- |
| title_en | \`${escapePipe(data.english)}\` |
| title_jp | \`${escapePipe(data.japanese)}\` |
| url | ${data.url} |
| Parodies | ${data.parody.join(", ")} |
| Characters | ${data.character.join(", ")} |
| Tags | ${data.keywords.join(", ")} |
| Artists | ${data.artist.join(", ")} |
| Groups | ${data.group.join(", ")} |
| Languages | ${data.language.join(", ")} |
| Categories | ${data.categories.join(", ")} |
| Pages | ${data.pagecount} |
| Uploaded | ${data.uploaded} |${getUnindexedDataTablePartStrBlock(data.unindexedData)}
`;
  }

  // Helpers
  function sanitizeTitle(str) {
    return (str + " 【nhentai】")
      .replaceAll("[", "【")
      .replaceAll("]", "】")
      .replaceAll(/[?:]/g, "_")
      .replaceAll(/\s{2,}/g, " ");
  }

  function getTitleStr(titleEl) {
    if (!titleEl) return "";
    return [".before", ".pretty", ".after"]
      .map(sel => titleEl.querySelector(sel)?.innerText.trim() || "")
      .join(" ")
      .replace(/\s{2,}/g, " ");
  }

  function getTagGroupName(tagGroupCon) {
    return tagGroupCon.firstChild.textContent.trim().replace(/:$/, "");
  }

  function getTagName(tagNameEl) {
    return tagNameEl.innerText.trim()
      .replace(/\s+/g, "-")
      .replace("-|-", "-or-");
  }

  function getLocalISOStringWithTimezone() {
    const date = new Date();
    const pad = n => String(n).padStart(2, "0");

    const offset = -date.getTimezoneOffset(); // actual UTC offset in minutes
    const sign = offset >= 0 ? "+" : "-";
    const hours = pad(Math.floor(Math.abs(offset) / 60));
    const minutes = pad(Math.abs(offset) % 60);

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T` +
      `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
      `${sign}${hours}:${minutes}`;
  }

  function getYamlArrayStr(arr) {
    return arr.map(i => `\n  - "${i}"`).join("");
  }

})();