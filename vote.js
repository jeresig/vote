// Ubiquity Voting Script for
// Reddit, Hacker News, and Digg
//  by John Resig http://ejohn.org/
// MIT Licensed - Copyright 2008

(function(){

function getDirection(text){
  if ( /^d/i.test(text) )
    return "down";
  if ( /^n/i.test(text) )
    return "none";
  if ( /^h/i.test(text) )
    return "hide";
  if ( /^f/i.test(text) )
    return "fave";
  if ( /^b/i.test(text) )
    return "bury";
  return "up";
}

function getFilterText(directObject, info) {
  var filter = directObject.extra ? new RegExp(directObject.extra, "i") : /.*/;

  if ( info.not && info.not.text ) {
    var notFilter = new RegExp(info.not.text, "i");
    return {test: function(string){
      return filter.test(string) && !notFilter.test(string);
    }};
  }

  return filter;
}

function getDirections(direction){
  var ret = null, set = null;
  var extra = "";

  direction = (direction || "").replace(/\s+(.*)$/, function(all, e){
    extra = e;
    return "";
  });
  direction = new RegExp(direction, "i");

  if ( typeof context != "undefined" ) {
    var location = context.focusedWindow.location;
 
    if ( /reddit.com/.test( location ) ) {
      set = [ "up", "down", "none", "hide" ];
    } else if ( /news.ycombinator.com/.test( location ) ) {
      set = [ "up" ];
    } else if ( /digg.com/.test( location ) ) {
      set = [ "up", "down", "fave", "bury" ];
    }
  } else {
    set = [ "up" ];
  }
  
  if ( set ) {
    ret = [];

    for ( var i = 0; i < set.length; i++ ) {
      if ( direction.test( set[i] ) ) {
        ret.push({ text: set[i], summary: set[i], extra: extra });
      }
    }
  }

  return ret;
}

function redditFilter(direction){
  return ({
    "down": ".down",
    "up": ".up",
    "none": ".downmod, .upmod",
    "hide": ".arrow"
  })[direction];
}

function diggFilter(direction){
  return ({
    "down": "img[src*=bury.png]",
    "up": "img[src*=digg.png]"
  })[direction];
}

CmdUtils.CreateCommand({
  name: "vote",
  takes: {
   "direction": { _name: "text", suggest: getDirections }
  },
  icon: "http://favicoop.com/image/a18b95189f9dade41eae18fe587d846ab",
  description: "Voting Script for Reddit, Hacker News, and Digg.",
  modifiers: { "not": noun_arb_text },
  execute: function( directObject, info ) {
    var direction = getDirection(directObject.text);
    var match = getFilterText( directObject, info );
    var location = context.focusedWindow.location;

    if ( /reddit.com/.test( location ) ) {
      var links = jQuery( "p.title", context.focusedWindow.document ).filter(function(){
        return match.test( this.textContent );
      }).parent();

      if ( direction == "hide" ) {
        links.find("form[action*=hide] a").each(function(){
          var script = context.focusedWindow.document.createElement("script");
          script.appendChild( context.focusedWindow.document.createTextNode( "change_w_callback(document.getElementById('" + this.id + "'), Listing.hide);" ) );
          this.appendChild( script );
        });
      } else {
        var comments = jQuery( "div.entry:has(div.md)", context.focusedWindow.document ).filter(function(){
          return jQuery("a.author", this).length &&
            match.test( jQuery("a.author", this)[0].textContent + ": " + jQuery("div.md", this)[0].textContent );
        });

        links = links.add( comments );

        links.prev().find(({
          "down": ".down",
          "up": ".up",
          "none": ".downmod, .upmod",
          "hide": ".arrow"
        })[direction]).each(function(){
          var script = context.focusedWindow.document.createElement("script");
          script.appendChild( context.focusedWindow.document.createTextNode( this.getAttribute("onclick") ) );
          this.appendChild( script );
        });
      }

    } else if ( /news.ycombinator.com/.test( location ) ) {
      links = jQuery( "td.title", context.focusedWindow.document ).filter(function(){
        return match.test( this.textContent );
      });

      var comments = jQuery( "span.comment", context.focusedWindow.document ).filter(function(){
        var link = jQuery(this).parent().find("a")[0];
        return link && jQuery(this).parent().prev(":has(a)").length &&
	  match.test(link.textContent + ": " + this.textContent);
      }).parent();

      links = links.add( comments );

      links.prev().find("a").each(function(){
        var script = context.focusedWindow.document.createElement("script");
        script.appendChild( context.focusedWindow.document.createTextNode( "vote(document.getElementById('" + this.id + "'));" ) );
        this.appendChild( script );
      });

    } else if ( /digg.com/.test( location ) ) {
      links = jQuery( "div.news-body h3", context.focusedWindow.document ).filter(function(){
        return match.test( this.textContent );
      });

      if ( direction == "up" ) {
        links.parent().next().find("li.digg-it a").each(function(){
          var script = context.focusedWindow.document.createElement("script");
          script.appendChild( context.focusedWindow.document.createTextNode( this.getAttribute("href") ) );
          this.appendChild( script );
        });
      } else if ( direction == "fave" ) {
        links.next().next().find("a.fave:visible").each(function(){
          var script = context.focusedWindow.document.createElement("script");
          script.appendChild( context.focusedWindow.document.createTextNode( this.getAttribute("onclick").replace(/return /, "") ) );
          this.appendChild( script );
        });
      } else if ( direction == "bury" ) {
        links.next().next().find("a.bury-link:visible").each(function(){
          var script = context.focusedWindow.document.createElement("script");
          script.appendChild( context.focusedWindow.document.createTextNode( this.getAttribute("href") ) );
          this.appendChild( script );
        });
      }

      if ( direction == "up" || direction == "down" ) {
        var comments = jQuery( "div.c-body", context.focusedWindow.document ).each(function(){
          var author = jQuery(this).prev().find("strong");
          if ( author.length && match.test( author[0].textContent + ": " + this.textContent ) ) {
            var img = jQuery(this).prev().prev().find(diggFilter(direction));
            var script = context.focusedWindow.document.createElement("script");
            script.appendChild( context.focusedWindow.document.createTextNode( 
              "jQuery('#" + img[0].id + "').click();" ) );
            this.appendChild( script );
          }
        });
      }
    }
  },

  preview: function( pblock, directObject, info ) {
    var direction = getDirection(directObject.text);
    var match = getFilterText( directObject, info );
    var location = context.focusedWindow.location;
    var links = null;

    if ( /reddit.com/.test( location ) ) {
      links = jQuery( "p.title", context.focusedWindow.document ).filter(function(){
        return match.test( this.textContent ) &&
          (direction == "hide" || jQuery(this).parent().prev().find(redditFilter(direction)).length);
      }).find("a.title");

      if ( direction != "hide" ) {
        var comments = jQuery( "div.entry:has(div.md)", context.focusedWindow.document ).filter(function(){
          return match.test( this.textContent ) &&
            jQuery("a.author", this).length &&
            jQuery(this).prev().find(redditFilter(direction)).length;
        }).map(function(){
          return jQuery("a.author", this)[0].textContent + ": " + jQuery("div.md", this)[0].textContent;
        });

        links = links.add( comments );
      }

    } else if ( /news.ycombinator.com/.test( location ) ) {
      links = jQuery( "td.title", context.focusedWindow.document ).filter(function(){
        return match.test( this.textContent ) && jQuery(this).prev(":has(a)").length;
      });

      var comments = jQuery( "span.comment", context.focusedWindow.document ).map(function(){
        var link = jQuery(this).parent().find("a")[0];
        if ( link && jQuery(this).parent().prev(":has(a)").length )
          return link.textContent + ": " + this.textContent;
      }).filter(function(){
        return match.test( this );
      });

      links = links.add( comments );

    } else if ( /digg.com/.test( location ) ) {
      links = jQuery( "div.news-body h3", context.focusedWindow.document ).filter(function(){
        return match.test( this.textContent ) &&
          direction != "down" &&
         ((direction == "up" && jQuery(this).parent().next(":has(li.digg-it a)").length) ||
          (direction == "bury" && jQuery(this).next().next(":has(div.bury)").length) ||
          (direction == "fave" && jQuery(this).next().next(":has(a.fave:visible)").length));
      });

      var comments = jQuery( "div.c-body", context.focusedWindow.document ).map(function(){
        var author = jQuery(this).prev().find("strong");
        author = author.length ? author[0].textContent : "";
        var comment = author + ": " + this.textContent

        if ( author && match.test( comment ) &&
          (direction == "up" || direction == "down") &&
          jQuery(this).prev().prev().find(diggFilter(direction)).length ) {
            return comment;
        }
      });

      links = links.add( comments );
    }

    if ( links && links.length ) {
      pblock.innerHTML = "<style>li div{height:1.3em;overflow-y:hidden;}</style>" + 
        "<b>Vote " + direction + " <b>" + links.length + "</b> link" +
        (links.length === 1 ? "" : "s") + " or comment" +
        (links.length === 1 ? "" : "s") + ":</b><ol>" +
        links.map(function(){
          return "<li><div>" + (this.textContent || this) + "</div></li>";
        }).get().join("") + "</ol>";
    } else if ( links ) {
      pblock.innerHTML = "<b>No links or comments found.</b>";
    } else {
      pblock.innerHTML = "This site doesn't support voting.";
    }
  }
});

})();
