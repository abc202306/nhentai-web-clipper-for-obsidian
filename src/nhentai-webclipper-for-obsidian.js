// ==UserScript==
// @name         NHentai Web Clipper for Obsidian
// @namespace    https://nhentai.net
// @version      v1.0.14.20251116
// @description  🔞 A user script that exports NHentai gallery metadata as Obsidian Markdown files (Obsidian NHentai Web Clipper).
// @author       abc202306
// @match        https://nhentai.net/g/*
// @icon         none
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  class Main {
    util;
    
    // Entry point
    static main(){
      new Main(new Util());
    }

    constructor(util) {
      this.util = util;
      this.util.startWebclipperWithDelay(
        2000,
        "NHentai Web Clipper for Obsidian (a tampermonkey user script by abc202306) says:\n\nDo you want to proceed to clip the nhentai gallery metadata as a obsidian markdown note (by obsidian uri protocol api)?\n\nclick 'OK' to proceed, or 'Cancel' to abort.",
        this.getNHentaiGalleryData.bind(this),
        this.getNHentaiOBMDNoteFileContent.bind(this)
      );

    }
    getNHentaiGalleryData() {
      const info = document.querySelector("#info");
      const titles = info.querySelectorAll(".title");

      const now = this.util.getLocalISOStringWithTimezone();

      const titleEN = this.util.getTitleStr(titles[0]);
      const titleJP = this.util.getTitleStr(titles[1]);

      const data = {
        title: this.util.sanitizeTitle(titleJP || titleEN, " 【nhentai】"),
        english: titleEN,
        japanese: titleJP,
        url: window.location.href,
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
        const groupName = tagGroupCon.firstChild.textContent.trim().replace(/:$/, "");
        if (groupName === "Uploaded") {
          data.uploaded = tagGroupCon.querySelector("time").dateTime;
        } else if (groupName === "Pages") {
          data.pagecount = this.getTagName(tagGroupCon.querySelector(".name"));
        } else if (keyMap[groupName]) {
          data[keyMap[groupName]] = [...tagGroupCon.querySelectorAll(".name")]
            .map(el => `[[${this.getTagName(el)}]]`);
        } else {
          const key = groupName.toLowerCase().replaceAll(/\s/,"");
          data.unindexedData[key] = [...tagGroupCon.querySelectorAll(".name")]
            .map(el => `[[${this.getTagName(el)}]]`);
        }
      });

      return data;
    }

    getNHentaiOBMDNoteFileContent(data){
      return `---
up:
  - "[[Gallery]]"
categories:${this.util.getYamlArrayStr(data.categories)}
keywords:${this.util.getYamlArrayStr(data.keywords)}
english: "${data.english}"
japanese: "${data.japanese}"
url: "${data.url}"
artist:${this.util.getYamlArrayStr(data.artist)}
group:${this.util.getYamlArrayStr(data.group)}
parody:${this.util.getYamlArrayStr(data.parody)}
character:${this.util.getYamlArrayStr(data.character)}
language:${this.util.getYamlArrayStr(data.language)}
pagecount: ${data.pagecount}
cover: "${data.cover}"
uploaded: ${data.uploaded}
ctime: ${data.ctime}
mtime: ${data.mtime}${this.util.getUnindexedDataFrontMatterPartStrBlock(data.unindexedData)}
---

# ${data.title}

![200](${data.cover})

| | |
| --- | --- |
| title_en | \`${this.util.escapePipe(data.english)}\` |
| title_jp | \`${this.util.escapePipe(data.japanese)}\` |
| url | ${data.url} |
| Parodies | ${data.parody.join(", ")} |
| Characters | ${data.character.join(", ")} |
| Tags | ${data.keywords.join(", ")} |
| Artists | ${data.artist.join(", ")} |
| Groups | ${data.group.join(", ")} |
| Languages | ${data.language.join(", ")} |
| Categories | ${data.categories.join(", ")} |
| Pages | ${data.pagecount} |
| Uploaded | ${data.uploaded} |${this.util.getUnindexedDataTablePartStrBlock(data.unindexedData)}
`;
    }

    getTagName(tagNameEl){
      return this.util.getTagNameStr(tagNameEl.innerText);
    }
  }


  // utils  

  class Util {
    startWebclipperWithDelay(timeout, message, getGalleryData, getOBMDNoteFileContent) {
      setTimeout(async () => {
        if (confirm(message)) {
          const galleryData = getGalleryData();
          const obsidianURI = this.getObsidianURI(
            galleryData.title, await getOBMDNoteFileContent(galleryData)
          );
          window.location.href = obsidianURI;
        }
      }, timeout);
    }

    // Build Obsidian URI
    getObsidianURI(theOBMDNotefileBaseName, theOBMDNoteFileContent) {
      const params = [
        ["file", `acg/galleries/${theOBMDNotefileBaseName}`],
        ["content", theOBMDNoteFileContent],
        ["append", "1"]
      ].map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");

      return `obsidian://new?${params};`;
    }

    getUnindexedDataFrontMatterPartStrBlock(unindexedData) {
      let unindexedDataFrontMatterPartStrBlock = '';
      Object.entries(unindexedData).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          unindexedDataFrontMatterPartStrBlock += `\n${key}:${this.getYamlArrayStr(value)}`;
        } else {
          unindexedDataFrontMatterPartStrBlock += `\n${key}: "${value}"`;
        }
      });
      return unindexedDataFrontMatterPartStrBlock;
    }

    getUnindexedDataTablePartStrBlock(unindexedData) {
      let unindexedDataTablePartStrBlock = '';
      Object.entries(unindexedData).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          unindexedDataTablePartStrBlock += `\n| ${key} | ${value.join(", ")} |`;
        } else {
          unindexedDataTablePartStrBlock += `\n| ${key} | ${value} |`;
        }
      });
      return unindexedDataTablePartStrBlock;
    }

    escapePipe(str) {
      return str.replace(/\|/g, "\\|");
    }

    sanitizeTitle(titleStr, addtionalSuffix) {
      return (titleStr + addtionalSuffix)
        .replaceAll("[", "【")
        .replaceAll("]", "】")
        .replaceAll(/[\\\/\|\*\?\:\<\>\"]/g, "_")
        .replaceAll(/\s{2,}/g, " ");
    }

    getTitleStr(titleEl) {
      if (!titleEl) return "";
      return titleEl.innerText.replace(/\s{2,}/g, " ");
    }

    getTagNameStr(str) {
      return str.trim()
        .replace(/\s+/g, "-")
        .replace("-|-", "-or-");
    }

    getLocalISOStringWithTimezone() {
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

    getYamlArrayStr(arr) {
      return arr.map(i => `\n  - "${i}"`).join("");
    }
  }

  Main.main();
})();