all: build/build.js

build/build.js: index.js lib/*.js
	# rebuild
	@component build --dev -s GCanvas -n gcanvas

components: component.json
	@component install --dev

test:
	@mocha -R list

clean:
	rm -fr build components template.js

.PHONY: clean test
