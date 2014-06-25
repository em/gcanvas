test:
	@mocha -R list

clean:
	rm -fr build components

.PHONY: clean test
