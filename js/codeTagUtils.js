/*
 * codeTagUtils.js
 * ------------------------------------------------------------
 * Utilities to parse <code-inline lang="...">...</code-inline> and
 * <code-block lang="...">...</code-block> markup inside story text and
 * render them safely (LTR) in HTML or React.
 *
 * Goals:
 *   • Preserve raw code exactly.
 *   • Force LTR rendering regardless of page dir (important in RTL langs).
 *   • Optional syntax highlighting hook (user-supplied).
 *   • No reliance on DOMParser (works in Node + browser).
 *
 * Exports:
 *   parseMarkup(str) -> token array
 *   tokensToHtml(tokens, opts?) -> HTML string
 *   renderMarkupToHtmlString(str, opts?) -> HTML string
 *   React components: <StoryMarkup>, <CodeInline>, <CodeBlock>
 *
 * Minimal CSS you provide (example):
 *   .code-inline{font-family:monospace;padding:0 2px;border-radius:3px;background:rgba(0,0,0,.08);}
 *   pre.code-block{font-family:monospace;padding:8px;border-radius:4px;background:rgba(0,0,0,.08);overflow-x:auto;}
 *
 * opts syntax highlighting:
 *   { highlighter: (code,lang,isBlock)=>({html,language}) }
 *   Return {html} escaped OR raw HTML ready to inject. If omitted we escape only.
 */

// ------------------------------------------------------------
// HTML escape util (minimal, fast)
// ------------------------------------------------------------
function escapeHtml(str){
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }
  
  // ------------------------------------------------------------
  // Core parser
  // Produces flat token stream preserving order.
  // Token shapes:
  //   {type:'text', text:string}
  //   {type:'code-inline', lang:string|undefined, code:string}
  //   {type:'code-block',  lang:string|undefined, code:string}
  // NOTE: No nested tags supported (spec forbids); parser greedy-safe.
  // ------------------------------------------------------------
  const CODE_TAG_RE = /<(code-inline|code-block)([^>]*)>([\s\S]*?)<\/\1>/gi;
  
  function parseMarkup(input){
    if(input==null) return [];
    const str = String(input);
    const tokens=[];
    let lastIndex=0;
    let m;
    while((m = CODE_TAG_RE.exec(str))){
      const [full, tag, attrStr, inner] = m;
      const start = m.index;
      if(start>lastIndex){
        tokens.push({type:'text', text:str.slice(lastIndex,start)});
      }
      const lang = extractLang(attrStr);
      tokens.push({type:tag === 'code-inline'?'code-inline':'code-block', lang, code:inner});
      lastIndex = start + full.length;
    }
    if(lastIndex < str.length){
      tokens.push({type:'text', text:str.slice(lastIndex)});
    }
    return tokens;
  }
  
  function extractLang(attrStr){
    if(!attrStr) return undefined;
    const m = /lang\s*=\s*"([^"]*)"/i.exec(attrStr);
    return m ? m[1].trim() || undefined : undefined;
  }
  
  // ------------------------------------------------------------
  // Convert plain-text segments to HTML (preserve \n as <br>)
  // ------------------------------------------------------------
  function textToHtml(text){
    // Split on newline; join with <br> to preserve formatting.
    return escapeHtml(text).replace(/\n/g,'<br>');
  }
  
  // ------------------------------------------------------------
  // Token -> HTML fragment builders
  // ------------------------------------------------------------
  function codeInlineToHtml(token, opts){
    const {highlighter} = opts||{};
    const lang = token.lang || 'text';
    let html;
    if(highlighter){
      const res = highlighter(token.code, lang, false) || {};
      html = res.html != null ? res.html : escapeHtml(token.code);
    }else{
      html = escapeHtml(token.code);
    }
    return `<code dir="ltr" class="code-inline" data-lang="${escapeHtml(lang)}">${html}</code>`;
  }
  
  function codeBlockToHtml(token, opts){
    const {highlighter} = opts||{};
    const lang = token.lang || 'text';
    let html;
    if(highlighter){
      const res = highlighter(token.code, lang, true) || {};
      html = res.html != null ? res.html : escapeHtml(token.code);
    }else{
      html = escapeHtml(token.code);
    }
    return `<pre dir="ltr" class="code-block" data-lang="${escapeHtml(lang)}"><code>${html}</code></pre>`;
  }
  
  // ------------------------------------------------------------
  // tokens -> HTML string
  // ------------------------------------------------------------
  function tokensToHtml(tokens, opts){
    return tokens.map(t=>{
      switch(t.type){
        case 'text': return textToHtml(t.text);
        case 'code-inline': return codeInlineToHtml(t, opts);
        case 'code-block': return codeBlockToHtml(t, opts);
        default: return '';
      }
    }).join('');
  }
  
  // Convenience one-shot
  function renderMarkupToHtmlString(str, opts){
    return tokensToHtml(parseMarkup(str), opts);
  }
  
  // ------------------------------------------------------------
  // Optional: integrate highlight.js lazily (if available)
  // Pass this as opts.highlighter
  // ------------------------------------------------------------
  function makeHLJSHighlighter(hljs){
    return function(code, lang, isBlock){
      try{
        if(lang && hljs.getLanguage(lang)){
          const {value} = hljs.highlight(code,{language:lang});
          return {html:value, language:lang};
        }else{
          const {value} = hljs.highlightAuto(code);
          return {html:value, language:lang};
        }
      }catch(_e){
        return {html:escapeHtml(code), language:lang};
      }
    };
  }
  
  // ------------------------------------------------------------
  // EXPORTS (CommonJS compatibility shim)
  // ------------------------------------------------------------
  export {
    escapeHtml,
    parseMarkup,
    tokensToHtml,
    renderMarkupToHtmlString,
    makeHLJSHighlighter
  };
  
  // If using CommonJS require(), uncomment:
  // module.exports = { escapeHtml, parseMarkup, tokensToHtml, renderMarkupToHtmlString, makeHLJSHighlighter, CodeInline, CodeBlock, StoryMarkup };
  