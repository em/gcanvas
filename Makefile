SOURCES = component.json *.js lib/*.js lib/*/*.js

all: build/build.js

build/build.js: $(SOURCES)
	# rebuild
	@component build --dev -s GCanvas -n gcanvas

components: component.json
	@component install --dev

test:
	@mocha -R list

clean:
	rm -fr build components template.js

.PHONY: clean test
