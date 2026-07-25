// docs/_includes/js/highlight.js

hljs.registerLanguage('lsd', function (hljs) {
  
  const SPECIAL_COMMENT = { scope: 'section',  match: /^[ \t]*####.*$/ };
  const KEYWORD         = { scope: 'keyword',  match: /^[ \t]*(?:META (?:LIST|PROP|TABLE)|CODE|HL|META|NODE|RULE|TKN)\b/ };  
  const OPERATOR        = { scope: 'operator', match: /==|::|=>/ };
  const STRING          = { scope: 'string', begin: /`/,  end: /`/,        contains: [hljs.BACKSLASH_ESCAPE] };
  const REGEX           = { scope: 'regexp', begin: /\//, end: /\/[a-z]*/, contains: [hljs.BACKSLASH_ESCAPE] };
  const PUNCTUATION     = { scope: 'punctuation', match: /[()[\]{}|<>*+?!]/ };
  const COMMENT         = hljs.COMMENT(/#/, /$/);

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
