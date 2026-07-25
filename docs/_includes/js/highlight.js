// docs/_includes/js/highlight.js

hljs.registerLanguage('lsd', function (hljs) {
  
  const SPECIAL_COMMENT = { scope: 'section', match: /^[ \t]*####.*$/ };
  const COMMENT         = hljs.COMMENT(/#/, /$/);
  const KEYWORD         = { scope: 'keyword', match: /^[ \t]*(?:META (?:PROP|LIST|TABLE)|META|TKN|HL|RULE|NODE)\b/ };  
  const OPERATOR        = { scope: 'operator', match: /==|::|=>/ };
  const STRING          = { scope: 'string', begin: /`/, end: /`/, contains: [hljs.BACKSLASH_ESCAPE] };
  const REGEX           = { scope: 'regexp', begin: /\//, end: /\/[a-z]*/, contains: [hljs.BACKSLASH_ESCAPE] };
  const PUNCTUATION     = { scope: 'punctuation', match: /[()[\]{}|<>*+?!]/ };

  return {
    name: 'LSD',
    aliases: ['grammar', 'cosmonaut'],
    case_insensitive: false,

    contains: [
      SPECIAL_COMMENT,
      COMMENT,
      KEYWORD,
      OPERATOR,
      STRING,
      REGEX,
      PUNCTUATION
    ]
  };
  
});
