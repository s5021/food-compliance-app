import { useState, useRef } from "react";
import jsPDF from "jspdf";

const COUNTRIES = [
  { code: "EU", label: "European Union", flag: "🇪🇺" },
  { code: "USA", label: "United States", flag: "🇺🇸" },
  { code: "UK", label: "United Kingdom", flag: "🇬🇧" },
  { code: "CANADA", label: "Canada", flag: "🇨🇦" },
  { code: "AUSTRALIA", label: "Australia", flag: "🇦🇺" },
  { code: "JAPAN", label: "Japan", flag: "🇯🇵" },
  { code: "GERMANY", label: "Germany", flag: "🇩🇪" },
  { code: "FRANCE", label: "France", flag: "🇫🇷" },
];

export default function App() {
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [country, setCountry] = useState("");
  const [customCountry, setCustomCountry] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState("document");
  const reportRef = useRef(null);

  const convertToBase64 = (file, setter, previewSetter) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setter(reader.result.split(",")[1]);
      previewSetter(reader.result);
    };
    if (file) reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    const targetCountry = country === "OTHER" ? customCountry : country;
    if (!frontImage || !backImage || !targetCountry) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(0);

    const ticker = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 10, 88));
    }, 400);

    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const res = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frontImage, backImage, country: targetCountry }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Server error");
      const data = await res.json();
      setResult(data);
      setProgress(100);
      setActiveTab("document");
      setTimeout(() => reportRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      setError(err.message);
    } finally {
      clearInterval(ticker);
      setLoading(false);
    }
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliance-report-${Date.now()}.json`;
    a.click();
  };

  const downloadPDF = () => {
    if (!result) return;
  
    const doc = new jsPDF();
  
    const d = result.summary.document_analysis;
    const p = result.summary.product_analysis;
    const targetCountry = country === "OTHER" ? customCountry : country;
  
    let y = 10;
  
    const addLine = (text, space = 7) => {
      doc.text(text, 10, y);
      y += space;
    };
  
    // Title
    doc.setFontSize(16);
    addLine("FOOD EXPORT COMPLIANCE REPORT", 10);
  
    doc.setFontSize(10);
    addLine(`Generated: ${new Date().toLocaleString()}`);
    addLine(`Target Market: ${targetCountry}`);
    addLine(`Final Verdict: ${result.verdict}`);
  
    y += 5;
  
    // Section 1
    doc.setFontSize(12);
    addLine("SECTION 1 — DOCUMENT ANALYSIS", 8);
  
    doc.setFontSize(10);
    addLine(`Title: ${d.title}`);
    addLine(`Issuer: ${d.issuer}`);
    addLine(`Date: ${d.date}`);
  
    y += 3;
    addLine("Compliance:");
    addLine(d.compliance);
  
    y += 3;
    addLine("Market Status:");
    addLine(d.market_status);
  
    y += 3;
    addLine("Labeling:");
    addLine(d.labeling);
  
    y += 5;
  
    // Section 2
    doc.setFontSize(12);
    addLine("SECTION 2 — PRODUCT ANALYSIS", 8);
  
    doc.setFontSize(10);
    addLine(`Product Name: ${p.product_name}`);
    addLine(`Origin: ${p.origin}`);
    addLine(`Manufacturer: ${p.manufacturer}`);
    addLine(`Packaging Location: ${p.packaging_location}`);
    addLine(`Energy: ${p.energy}`);
    addLine(`Protein: ${p.protein}`);
    addLine(`Salt: ${p.salt}`);
    addLine(`Storage: ${p.storage}`);
    addLine(`Best Before: ${p.best_before}`);
  
    y += 5;
  
    // Section 3
    doc.setFontSize(12);
    addLine("SECTION 3 — COMPLIANCE REPORT", 8);
  
    doc.setFontSize(10);
    addLine(result.report?.summary || "");
  
    y += 3;
  
    (result.report?.observations || []).forEach((obs, i) => {
      addLine(`${i + 1}. ${obs}`);
    });
  
    y += 3;
    addLine("Recommendation:");
    addLine(result.report?.recommendation || "");
  
    // Save PDF
    doc.save(`compliance-report-${Date.now()}.pdf`);
  };

  const isCompliant = result?.verdict === "Compliant";
  const targetCountry = country === "OTHER" ? customCountry : country;

  return (
    <div className="app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --navy: #0A0F1E;
          --navy2: #0F1628;
          --panel: #131929;
          --card: #1A2240;
          --border: rgba(255,255,255,0.07);
          --border2: rgba(255,255,255,0.12);
          --accent: #00D4FF;
          --accent2: #0099CC;
          --gold: #F5C842;
          --green: #00E5A0;
          --red: #FF5C5C;
          --text: #E8ECF4;
          --muted: #8892A4;
          --mono: 'JetBrains Mono', monospace;
          --sans: 'Sora', sans-serif;
        }

        body { background: var(--navy); color: var(--text); font-family: var(--sans); min-height: 100vh; }

        .app { min-height: 100vh; display: flex; flex-direction: column; }

        /* ── Header ── */
        .header {
          background: linear-gradient(135deg, var(--navy2) 0%, #0D1530 100%);
          border-bottom: 1px solid var(--border);
          padding: 0 2rem;
          position: sticky; top: 0; z-index: 100;
        }
        .header-inner {
          max-width: 1280px; margin: 0 auto;
          display: flex; align-items: center; justify-content: space-between;
          height: 64px;
        }
        .logo { display: flex; align-items: center; gap: 10px; }
        .logo-icon {
          width: 34px; height: 34px; border-radius: 8px;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
        }
        .logo-text { font-size: 15px; font-weight: 600; letter-spacing: -0.02em; }
        .logo-text span { color: var(--accent); }
        .header-badge {
          font-family: var(--mono); font-size: 10px; font-weight: 500;
          padding: 4px 10px; border-radius: 20px;
          background: rgba(0,212,255,0.08); color: var(--accent);
          border: 1px solid rgba(0,212,255,0.2);
          letter-spacing: 0.06em;
        }

        /* ── Main layout ── */
        .main { max-width: 1280px; margin: 0 auto; padding: 2rem; width: 100%; flex: 1; }

        /* ── Page title ── */
        .page-title { margin-bottom: 2rem; }
        .page-title h1 {
          font-size: 28px; font-weight: 700; letter-spacing: -0.03em;
          line-height: 1.2;
        }
        .page-title h1 span { color: var(--accent); }
        .page-title p { color: var(--muted); font-size: 13px; margin-top: 6px; }

        /* ── Upload grid ── */
        .upload-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;
          margin-bottom: 1.25rem;
        }
        @media(max-width:640px) { .upload-grid { grid-template-columns: 1fr; } }

        .upload-card {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 12px; overflow: hidden;
        }
        .upload-card-header {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center; gap: 8px;
        }
        .upload-tag {
          font-family: var(--mono); font-size: 10px; font-weight: 500;
          padding: 2px 8px; border-radius: 4px;
          background: rgba(0,212,255,0.1); color: var(--accent);
          border: 1px solid rgba(0,212,255,0.2);
        }
        .upload-tag.back { background: rgba(245,200,66,0.1); color: var(--gold); border-color: rgba(245,200,66,0.2); }
        .upload-label { font-size: 13px; font-weight: 500; }

        .upload-zone {
          position: relative; min-height: 220px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background 0.2s;
          background: rgba(255,255,255,0.01);
        }
        .upload-zone:hover { background: rgba(255,255,255,0.03); }
        .upload-zone input {
          position: absolute; inset: 0; opacity: 0; cursor: pointer;
          width: 100%; height: 100%;
        }
        .upload-placeholder { text-align: center; pointer-events: none; }
        .upload-placeholder .icon { font-size: 32px; margin-bottom: 10px; opacity: 0.4; }
        .upload-placeholder p { font-size: 13px; color: var(--muted); }
        .upload-placeholder span { font-size: 12px; color: var(--accent); font-weight: 500; margin-top: 4px; display: block; }

        .preview-wrap { position: relative; width: 100%; }
        .preview-img { width: 100%; max-height: 240px; object-fit: contain; display: block; padding: 12px; }
        .preview-overlay {
          position: absolute; bottom: 8px; left: 8px;
          font-family: var(--mono); font-size: 10px;
          background: rgba(10,15,30,0.85); color: var(--green);
          padding: 3px 8px; border-radius: 4px;
          border: 1px solid rgba(0,229,160,0.3);
        }

        /* ── Country + analyze ── */
        .controls-row {
          display: grid; grid-template-columns: 1fr auto; gap: 1rem;
          align-items: end; margin-bottom: 1.5rem;
        }
        @media(max-width:640px) { .controls-row { grid-template-columns: 1fr; } }

        .field-group { display: flex; flex-direction: column; gap: 6px; }
        .field-label { font-size: 11px; font-weight: 500; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }

        .select-field, .input-field {
          background: var(--panel); border: 1px solid var(--border2);
          color: var(--text); font-family: var(--sans); font-size: 13px;
          border-radius: 8px; padding: 10px 14px; width: 100%;
          outline: none; transition: border-color 0.2s;
          appearance: none;
        }
        .select-field:focus, .input-field:focus { border-color: var(--accent); }
        .select-wrap { position: relative; }
        .select-wrap::after {
          content: '▾'; position: absolute; right: 12px; top: 50%;
          transform: translateY(-50%); color: var(--muted); pointer-events: none;
          font-size: 12px;
        }

        .analyze-btn {
          padding: 12px 28px; border-radius: 8px; border: none;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          color: #000; font-family: var(--sans); font-size: 13px; font-weight: 600;
          cursor: pointer; white-space: nowrap; transition: all 0.2s;
          display: flex; align-items: center; gap: 8px;
          min-width: 160px; justify-content: center;
        }
        .analyze-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(0,212,255,0.3); }
        .analyze-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

        /* ── Progress ── */
        .progress-bar { height: 3px; background: var(--border); border-radius: 2px; overflow: hidden; margin-bottom: 1.5rem; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--green)); border-radius: 2px; transition: width 0.4s ease; }

        /* ── Error ── */
        .error-box {
          background: rgba(255,92,92,0.08); border: 1px solid rgba(255,92,92,0.3);
          border-radius: 8px; padding: 12px 16px; margin-bottom: 1rem;
          font-size: 13px; color: var(--red);
        }

        /* ── Result ── */
        .result-section { animation: fadeUp 0.4s ease; }
        @keyframes fadeUp { from { opacity:0; transform: translateY(16px); } to { opacity:1; transform: translateY(0); } }

        /* Verdict banner */
        .verdict-banner {
          border-radius: 12px; padding: 1.25rem 1.5rem;
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;
          border: 1px solid;
        }
        .verdict-banner.compliant { background: rgba(0,229,160,0.06); border-color: rgba(0,229,160,0.25); }
        .verdict-banner.not-compliant { background: rgba(255,92,92,0.06); border-color: rgba(255,92,92,0.25); }

        .verdict-left { display: flex; align-items: center; gap: 14px; }
        .verdict-icon {
          width: 44px; height: 44px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; flex-shrink: 0;
        }
        .compliant .verdict-icon { background: rgba(0,229,160,0.15); }
        .not-compliant .verdict-icon { background: rgba(255,92,92,0.15); }
        .verdict-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 3px; font-family: var(--mono); }
        .verdict-text { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
        .compliant .verdict-text { color: var(--green); }
        .not-compliant .verdict-text { color: var(--red); }
        .verdict-country { font-size: 13px; color: var(--muted); }
        .verdict-country strong { color: var(--text); }

        /* Download buttons */
        .download-group { display: flex; gap: 8px; }
        .dl-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 7px; border: none; cursor: pointer;
          font-family: var(--sans); font-size: 12px; font-weight: 500;
          transition: all 0.2s;
        }
        .dl-btn.json { background: rgba(0,212,255,0.1); color: var(--accent); border: 1px solid rgba(0,212,255,0.2); }
        .dl-btn.txt { background: rgba(245,200,66,0.1); color: var(--gold); border: 1px solid rgba(245,200,66,0.2); }
        .dl-btn:hover { transform: translateY(-1px); }

        /* Tabs */
        .tabs { display: flex; gap: 4px; margin-bottom: 1rem; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 4px; }
        .tab-btn {
          flex: 1; padding: 8px 12px; border-radius: 7px; border: none;
          background: transparent; color: var(--muted); font-family: var(--sans);
          font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 5px;
        }
        .tab-btn.active { background: var(--card); color: var(--text); box-shadow: 0 1px 4px rgba(0,0,0,0.3); }

        /* Cards */
        .report-card {
          background: var(--panel); border: 1px solid var(--border);
          border-radius: 12px; overflow: hidden; margin-bottom: 1rem;
        }
        .card-header {
          padding: 14px 18px; border-bottom: 1px solid var(--border);
          display: flex; align-items: center; gap: 10px;
        }
        .card-header-icon {
          width: 28px; height: 28px; border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px;
        }
        .card-header h3 { font-size: 13px; font-weight: 600; }
        .card-body { padding: 18px; }

        /* Field rows */
        .field-row {
          display: grid; grid-template-columns: 160px 1fr;
          gap: 8px; padding: 9px 0;
          border-bottom: 1px solid var(--border);
          align-items: start;
        }
        .field-row:last-child { border-bottom: none; }
        .field-key { font-family: var(--mono); font-size: 11px; color: var(--muted); padding-top: 1px; }
        .field-val { font-size: 13px; line-height: 1.6; color: var(--text); }
        .field-val.long { font-size: 12.5px; color: #c8d0e0; }

        /* Nutrition grid */
        .nutrition-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        @media(max-width:480px) { .nutrition-grid { grid-template-columns: 1fr 1fr; } }
        .nutrition-tile {
          background: var(--card); border: 1px solid var(--border);
          border-radius: 8px; padding: 12px;
          text-align: center;
        }
        .nutrition-value { font-size: 18px; font-weight: 700; color: var(--accent); font-family: var(--mono); }
        .nutrition-key { font-size: 10px; color: var(--muted); margin-top: 3px; text-transform: uppercase; letter-spacing: 0.05em; }

        /* Observation items */
        .observation {
          background: var(--card); border: 1px solid var(--border);
          border-radius: 8px; padding: 14px; margin-bottom: 8px;
          font-size: 13px; line-height: 1.7; color: #c8d0e0;
          border-left: 3px solid var(--accent);
        }
        .observation:last-child { margin-bottom: 0; }

        /* Recommendation box */
        .rec-box {
          border-radius: 10px; padding: 14px 16px;
          font-size: 13px; font-weight: 500; line-height: 1.6;
          border: 1px solid;
        }
        .rec-box.compliant { background: rgba(0,229,160,0.07); border-color: rgba(0,229,160,0.25); color: var(--green); }
        .rec-box.not-compliant { background: rgba(255,92,92,0.07); border-color: rgba(255,92,92,0.25); color: var(--red); }

        /* Images panel */
        .images-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media(max-width:480px) { .images-grid { grid-template-columns: 1fr; } }
        .image-panel { background: var(--card); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
        .image-panel-label {
          padding: 10px 14px; font-size: 11px; font-weight: 500;
          text-transform: uppercase; letter-spacing: 0.07em; color: var(--muted);
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center; gap: 6px;
        }
        .image-panel img { width: 100%; max-height: 280px; object-fit: contain; display: block; padding: 10px; }

        /* Spinner */
        .spinner {
          width: 16px; height: 16px; border: 2px solid rgba(0,0,0,0.2);
          border-top-color: #000; border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Footer */
        .footer {
          border-top: 1px solid var(--border); padding: 1rem 2rem;
          text-align: center; font-size: 11px; color: var(--muted);
          font-family: var(--mono);
        }
      `}</style>

      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <div className="logo-icon">🛡</div>
            <div className="logo-text">Food<span>Comply</span> AI</div>
          </div>
          <div className="header-badge">AZURE AI POWERED</div>
        </div>
      </header>

      <main className="main">
        {/* Page title */}
        <div className="page-title">
          <h1>Export <span>Compliance</span> Dashboard</h1>
          <p>Upload food packaging images and receive AI-generated regulatory compliance reports for global markets.</p>
        </div>

        {/* Upload grid */}
        <div className="upload-grid">
          {[
            { label: "Front Label", tag: "FRONT", tagClass: "", setter: setFrontImage, previewSetter: setFrontPreview, preview: frontPreview, icon: "📦" },
            { label: "Back Label", tag: "BACK", tagClass: "back", setter: setBackImage, previewSetter: setBackPreview, preview: backPreview, icon: "📋" },
          ].map(({ label, tag, tagClass, setter, previewSetter, preview, icon }) => (
            <div className="upload-card" key={tag}>
              <div className="upload-card-header">
                <span className={`upload-tag ${tagClass}`}>{tag}</span>
                <span className="upload-label">{label}</span>
              </div>
              <div className="upload-zone">
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => convertToBase64(e.target.files[0], setter, previewSetter)}
                />
                {preview ? (
                  <div className="preview-wrap">
                    <img src={preview} alt={label} className="preview-img" />
                    <div className="preview-overlay">✓ Base64 encoded</div>
                  </div>
                ) : (
                  <div className="upload-placeholder">
                    <div className="icon">{icon}</div>
                    <p>Drop image or click to browse</p>
                    <span>PNG, JPG, WEBP supported</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="controls-row">
          <div className="field-group">
            <label className="field-label">Target Export Market</label>
            <div className="select-wrap">
              <select
                className="select-field"
                value={country}
                onChange={e => setCountry(e.target.value)}
              >
                <option value="">Select country or region...</option>
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.label}</option>
                ))}
                <option value="OTHER">🌍 Other (specify below)</option>
              </select>
            </div>
            {country === "OTHER" && (
              <input
                className="input-field"
                placeholder="Enter country name..."
                value={customCountry}
                onChange={e => setCustomCountry(e.target.value)}
                style={{ marginTop: 8 }}
              />
            )}
          </div>
          <button
            className="analyze-btn"
            onClick={handleAnalyze}
            disabled={!frontImage || !backImage || !country || (country === "OTHER" && !customCountry) || loading}
          >
            {loading ? <><div className="spinner" />Analyzing...</> : <>⚡ Run Analysis</>}
          </button>
        </div>

        {/* Progress */}
        {loading && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        )}

        {/* Error */}
        {error && <div className="error-box">⚠ {error}</div>}

        {/* Result */}
        {result && (
          <div className="result-section" ref={reportRef}>

            {/* Verdict Banner */}
            <div className={`verdict-banner ${isCompliant ? "compliant" : "not-compliant"}`}>
              <div className="verdict-left">
                <div className="verdict-icon">
                  {isCompliant ? "✅" : "❌"}
                </div>
                <div>
                  <div className="verdict-label">Compliance Verdict</div>
                  <div className="verdict-text">{result.verdict}</div>
                  <div className="verdict-country">
                    Target market: <strong>{targetCountry}</strong>
                  </div>
                </div>
              </div>
              <div className="download-group">
                <button className="dl-btn json" onClick={downloadJSON}>
                  ⬇ JSON Report
                </button>
                <button className="dl-btn txt" onClick={downloadPDF}>
                  ⬇ PDF Report
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
              {[
                { id: "document", label: "📄 Document Analysis" },
                { id: "product", label: "📦 Product Details" },
                { id: "report", label: "📊 Compliance Report" },
                { id: "images", label: "🖼 Package Images" },
              ].map(t => (
                <button
                  key={t.id}
                  className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Document Analysis tab */}
            {activeTab === "document" && (
              <div className="report-card">
                <div className="card-header">
                  <div className="card-header-icon" style={{ background: "rgba(0,212,255,0.1)" }}>📄</div>
                  <h3>Document Analysis</h3>
                </div>
                <div className="card-body">
                  {[
                    ["Title", result.summary.document_analysis.title],
                    ["Issuer", result.summary.document_analysis.issuer],
                    ["Date", result.summary.document_analysis.date],
                    ["Compliance Assessment", result.summary.document_analysis.compliance, true],
                    ["Market Status", result.summary.document_analysis.market_status, true],
                    ["Labeling Compliance", result.summary.document_analysis.labeling, true],
                  ].map(([key, val, long]) => (
                    <div className="field-row" key={key}>
                      <div className="field-key">{key}</div>
                      <div className={`field-val ${long ? "long" : ""}`}>{val || "—"}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Product Details tab */}
            {activeTab === "product" && (() => {
              const p = result.summary.product_analysis;
              return (
                <>
                  <div className="report-card">
                    <div className="card-header">
                      <div className="card-header-icon" style={{ background: "rgba(245,200,66,0.1)" }}>📦</div>
                      <h3>Product Information</h3>
                    </div>
                    <div className="card-body">
                      {[
                        ["Product Name", p.product_name],
                        ["Origin", p.origin],
                        ["Manufacturer", p.manufacturer],
                        ["Packaging Location", p.packaging_location],
                        ["Storage Instructions", p.storage],
                        ["Best Before", p.best_before],
                      ].map(([key, val]) => (
                        <div className="field-row" key={key}>
                          <div className="field-key">{key}</div>
                          <div className="field-val">{val || "Not Found"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="report-card">
                    <div className="card-header">
                      <div className="card-header-icon" style={{ background: "rgba(0,229,160,0.1)" }}>⚗</div>
                      <h3>Nutritional Values</h3>
                    </div>
                    <div className="card-body">
                      <div className="nutrition-grid">
                        {[
                          ["Energy", p.energy, "kcal"],
                          ["Protein", p.protein, "g"],
                          ["Salt", p.salt, "g"],
                        ].map(([key, val]) => (
                          <div className="nutrition-tile" key={key}>
                            <div className="nutrition-value">{val || "—"}</div>
                            <div className="nutrition-key">{key}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}

            {/* Compliance Report tab */}
            {activeTab === "report" && (
              <>
                <div className="report-card">
                  <div className="card-header">
                    <div className="card-header-icon" style={{ background: "rgba(0,212,255,0.1)" }}>📊</div>
                    <h3>Report Summary</h3>
                  </div>
                  <div className="card-body">
                    <p style={{ fontSize: 13, lineHeight: 1.7, color: "#c8d0e0" }}>
                      {result.report?.summary}
                    </p>
                  </div>
                </div>
                <div className="report-card">
                  <div className="card-header">
                    <div className="card-header-icon" style={{ background: "rgba(245,200,66,0.1)" }}>🔍</div>
                    <h3>Detailed Observations</h3>
                  </div>
                  <div className="card-body">
                    {(result.report?.observations || []).map((obs, i) => (
                      <div className="observation" key={i}>
                        <strong style={{ color: "var(--accent)", fontFamily: "var(--mono)", fontSize: 10 }}>
                          OBSERVATION {String(i + 1).padStart(2, "0")}
                        </strong>
                        <p style={{ marginTop: 6 }}>{obs}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={`rec-box ${isCompliant ? "compliant" : "not-compliant"}`}>
                  {result.report?.recommendation}
                </div>
              </>
            )}

            {/* Images tab */}
            {activeTab === "images" && (
              <div className="report-card">
                <div className="card-header">
                  <div className="card-header-icon" style={{ background: "rgba(0,212,255,0.1)" }}>🖼</div>
                  <h3>Analyzed Packaging Images</h3>
                </div>
                <div className="card-body">
                  <div className="images-grid">
                    {frontPreview && (
                      <div className="image-panel">
                        <div className="image-panel-label">
                          <span style={{ color: "var(--accent)" }}>◆</span> Front Label
                        </div>
                        <img src={frontPreview} alt="Front" />
                      </div>
                    )}
                    {backPreview && (
                      <div className="image-panel">
                        <div className="image-panel-label">
                          <span style={{ color: "var(--gold)" }}>◆</span> Back Label
                        </div>
                        <img src={backPreview} alt="Back" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </main>

      <footer className="footer">
        FoodComply AI · Powered by Azure OpenAI + Azure AI Search · For regulatory use only
      </footer>
    </div>
  );
}
