6TO5 = ./node_modules/.bin/6to5

all: node

node: lib
  @for path in lib/*.js; do \
    file=`basename $$path`; \
    $(6TO5) "lib/$$file" > "node/$$file"; \
  done

convert:
	babel lib/index.js -o index.js
