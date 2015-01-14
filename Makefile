test:
	./node_modules/.bin/mocha --reporter list --compilers coffee:coffee-script/register --timeout 3000
	
.PHONY: test
