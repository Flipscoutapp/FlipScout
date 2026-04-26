import React, { useState, useEffect, useMemo } from "react";

const ALL_CATEGORIES = [
  { id: "all", name: "All Categories", emoji: "ğŸ”" },
  { id: "abcat0502000", name: "Laptops", emoji: "ğŸ’»" },
  { id: "abcat0101000", name: "TVs", emoji: "ğŸ“º" },
  { id: "pcmcat209400050001", name: "Headphones", emoji: "ğŸ§" }
];

const fmt = (n) => "$" + (n || 0).toFixed(2);

export default function App() {
  const [zip, setZip] = useState("01602");
  const [selectedCat, setSelectedCat] = useState("all");
  const [loading, setLoading] = useState(false);
  const [analyses, setAnalyses] = useState([]);

  const handleSearci = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || "https://flipscout.onrender.com";
      const r = await fetch(`${apiUrl}/api/profit-analysis?zip_code=${zip}&category_id=${selectedCat}`);
      const d = await r.json();
      if (d.analyses) setAnalyses(d.analyses);
    } catch (er‰ì¢W®º+yø§jYr±ëK¡¦F–ær†fÇ6R“²ÒÓ²&WGW&âƒÆF—b7G–ÆS×·¶&6¶w&÷VæD6öÆ÷#¢"3"Â6öÆ÷#¢"3#“ƒ"ÂÖ–ä†V–v‡C¢#f‚"ÂFF–æs¢##‚"ÂföçDfÖ–Ç“¢'6ç2×6W&–b'×ÓãÆF—b7G–ÆS×·¶Ö…v–GFƒ¢#c‚"ÂÖ&v–ã¢#WFò'×ÓãÆ†VFW"7G–ÆS×·¶Ö&v–ä&÷GFöÓ¢#C‚'×ÓãÆƒ7G–ÆS×·¶föçE6—¦S¢#7&VÒ"ÂföçEvV–v‡C¢#“"ÂÖ&v–ã£×ÓäfÆ—66÷WBÇ7â7G–ÆS×·¶6öÆ÷#¢"6ffb'×Óå&óÂ÷7ããÂöƒãÂö†VFW#ãÆF—b7G–ÆS×·¶&6¶w&÷VæD6öÆ÷#¢"3"ÂFF–æs¢##‚"Â&÷&FW%&F—W3¢##‚"ÂF—7Æ“¢&fÆW‚"Âv¢#‚'×ÓãÆ–çWBfÇVS×·¦—Òöä6†ævS×²†R“Óç6WE¦—†RçF&vWBçfÇVR—Ò7G–ÆS×·¶&6¶w&÷VæD6öÆ÷#¢"3"Â&÷&FW#¢#‚6öÆ–B3332"Â6öÆ÷#¢"6ffb"ÂFF–æs¢#'‚"Â&÷VæFVC¢#‚"ÂfÆWƒ£×ÒóãÆ'WGFöâöä6Æ–6³×²†æFÆU6V&6‡Ò7G–ÆS×·¶&6¶w&÷VæD6öÆ÷#¢"3#“ƒ"Â6öÆ÷#¢"3"ÂFF–æs¢#'‚3‚"Â&÷&FW%&F—W3¢#‡‚"Â&÷&FW#¢&æöæR"ÂföçEvV–v‡C¢&&öÆB'×Óå66÷WCÂö'WGFöããÂöF—cãÆF—b7G–ÆS×·¶Ö&v–åF÷¢#3‚"ÂF—7Æ“¢&w&–B"Âv¢#W‚'×Óç¶æÇ—6W2æÖ‚†’ÓâƒÆF—b¶W“×¶ç6·WÒ7G–ÆS×·¶&6¶w&÷VæD6öÆ÷#¢"3"ÂFF–æs¢##‚"Â&÷&FW%&F—W3¢#'‚"Â&÷&FW#¢#‚6öÆ–B3#“ƒ32'×ÓãÆƒ27G–ÆS×·¶6öÆ÷#¢"6ffb"ÂÖ&v–ã£×Óç¶ç&öGV7DæÖWÓÂöƒ3ãÆF—b7G–ÆS×·¶föçE6—¦S¢#ãW&VÒ"ÂföçEvV–v‡C¢&&öÆB"'×Óâ·¶f×B†ç&V6öÖÖVæFF–öãòæ&W7E&öf—B—ÓÂöF—cãÂöF—câ’—ÓÂöF—cãÂöF—cãÂöF—câ“²