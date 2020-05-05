# SQLite syntax from : https://github.com/mandel59/sqlite-wasm (MIT License) Credited in LICENSE
# To use another version of Sqlite, visit https://www.sqlite.org/download.html and copy the appropriate values here:
SQLITE_AMALGAMATION := sqlite-amalgamation-3300100
SQLITE_AMALGAMATION_ZIP_URL := https://www.sqlite.org/2019/$(SQLITE_AMALGAMATION).zip
SQLITE_AMALGAMATION_ZIP_SHA1 := ff9b4e140fe0764bc7bc802facf5ac164443f517

# See: https://github.com/emscripten-core/emscripten/blob/incoming/src/settings.js
EMCC_OPTS = \
	-s ERROR_ON_UNDEFINED_SYMBOLS=0 \
	-s MALLOC="emmalloc" \
	-fno-exceptions \
	--llvm-opts 3 \
	--llvm-lto 1 \
	--memory-init-file 0 \
	-s RESERVED_FUNCTION_POINTERS=64 \
	-s NODEJS_CATCH_EXIT=0 \
	-s ALLOW_MEMORY_GROWTH=1 \
	-s ENVIRONMENT='worker' \
	-s MODULARIZE=1 \
	-s EXPORT_ES6=1 \
	-s USE_ES6_IMPORT_META=0
	

# See https://www.sqlite.org/compile.html for more about the compile-time options
EMCC_SQLITE_FLAGS = \
	-DSQLITE_ENABLE_FTS5 \
	-DSQLITE_OMIT_LOAD_EXTENSION \
	-DSQLITE_DISABLE_LFS \
	-DLONGDOUBLE_TYPE=double \
	-DSQLITE_THREADSAFE=0 \
	-DSQLITE_DQS=0\
	-DSQLITE_DEFAULT_MEMSTATUS=0 \
	-DSQLITE_OMIT_DEPRECATED \
	-DSQLITE_MAX_EXPR_DEPTH=0 \
	-DSQLITE_OMIT_SHARED_CACHE \
	-DSQLITE_OMIT_PROGRESS_CALLBACK \
	-DSQLITE_OMIT_DECLTYPE \
	$(SQLITE_OWN_OPTIMIZATIONS)

# This reduces the WASM size from 518k (253k gzipped) => 406k (200k gzipped)
SQLITE_OWN_OPTIMIZATIONS = \
	-DSQLITE_OMIT_ALTERTABLE \
	-DSQLITE_OMIT_ANALYZE \
	-DSQLITE_OMIT_ATTACH \
	-DSQLITE_OMIT_AUTHORIZATION \
	-DSQLITE_OMIT_AUTOINCREMENT \
	-DSQLITE_OMIT_AUTOMATIC_INDEX \
	-DSQLITE_OMIT_AUTOVACUUM \
	-DSQLITE_OMIT_BETWEEN_OPTIMIZATION \
	-DSQLITE_OMIT_BLOB_LITERAL \
	-DSQLITE_OMIT_BTREECOUNT \
	-DSQLITE_OMIT_CASE_SENSITIVE_LIKE_PRAGMA \
	-DSQLITE_OMIT_CAST \
	-DSQLITE_OMIT_CHECK \
	-DSQLITE_OMIT_COMPILEOPTION_DIAGS \
	-DSQLITE_OMIT_COMPLETE \
	-DSQLITE_OMIT_COMPOUND_SELECT \
	-DSQLITE_OMIT_DATETIME_FUNCS \
	-DSQLITE_OMIT_DECLTYPE \
	-DSQLITE_OMIT_EXPLAIN \
	-DSQLITE_OMIT_FLAG_PRAGMAS \
	-DSQLITE_OMIT_FOREIGN_KEY \
	-DSQLITE_OMIT_GET_TABLE \
	-DSQLITE_OMIT_INTEGRITY_CHECK \
	-DSQLITE_OMIT_INTROSPECTION_PRAGMAS \
	-DSQLITE_OMIT_LIKE_OPTIMIZATION \
	-DSQLITE_OMIT_LOCALTIME \
	-DSQLITE_OMIT_LOOKASIDE \
	-DSQLITE_OMIT_MEMORYDB \
	-DSQLITE_OMIT_OR_OPTIMIZATION \
	-DSQLITE_OMIT_PAGER_PRAGMAS \
	-DSQLITE_OMIT_QUICKBALANCE \
	-DSQLITE_OMIT_REINDEX \
	-DSQLITE_OMIT_AUTORESET \
	-DSQLITE_OMIT_SCHEMA_PRAGMAS \
	-DSQLITE_OMIT_SCHEMA_VERSION_PRAGMAS \
	-DSQLITE_OMIT_SUBQUERY \
	-DSQLITE_OMIT_TCL_VARIABLE \
	-DSQLITE_OMIT_TEMPDB \
	-DSQLITE_OMIT_TRACE \
	-DSQLITE_OMIT_TRUNCATE_OPTIMIZATION \
	-DSQLITE_OMIT_UTF16 \
	-DSQLITE_OMIT_VACUUM \
	-DSQLITE_OMIT_VIEW \
	-DSQLITE_OMIT_WAL \
	-DSQLITE_OMIT_XFER_OPT \
	-DSQLITE_UNTESTABLE

# Error during the compile time
	# -DSQLITE_OMIT_CTE \
	# -DSQLITE_OMIT_FLOATING_POINT
	# -DSQLITE_OMIT_TRIGGER \
	# -DSQLITE_OMIT_VIRTUALTABLE

# Error in runtime
# This reduces the WASM size from 518k (253k gzipped) => 398k (196k gzipped)
	# "missing function: sqlite3Pragma"
	# -DSQLITE_OMIT_PRAGMA \
	# "missing function: sqlite3_blob_open"
	# -DSQLITE_OMIT_INCRBLOB \


# Top level build targets
all: dist/blogsearch.umd.js dist/worker.umd.js dist/blogsearch.wasm dist/blogsearch.min.css
	@$(foreach target, $^, $(call print_size, $(target)))

define print_size
	printf '=> $(1)\tsize: %s\tgzipped: %s\n' \
		$$(cat $(1) | wc -c | numfmt --to=iec) \
		$$(gzip -9 < $(1) | wc -c | numfmt --to=iec);
endef

# [TODO] --closure 1 optimization breaks the code
dist: EMCC_OPTS += -Oz
dist: WEBPACK_OPTS += --mode production
dist: all

debug: EMCC_OPTS += -g4 -s ASSERTIONS=2 -s SAFE_HEAP=1 -s STACK_OVERFLOW_CHECK=1
debug: WEBPACK_OPTS += --mode development
##		[TODO] Fails when enabled. Fix the source in order to make it work.
## 		Assertion failed: p->iStructVersion!=0, at: sqlite-src/sqlite-amalgamation-3300100/sqlite3.c,212053,fts5StructureRead
# debug: EMCC_SQLITE_FLAGS += -DSQLITE_DEBUG
debug: all

################################################################################
# Building JS
################################################################################
TS_SRC = $(shell \
	find src/lib/ -type f \
		-name '*.ts' \
		-not -path "*/__mocks__/*" \
		-not -path "*/__tests__/*")
# Basically: src/lib/*.ts => lib/*.js, except TypeScript .d.js files
JS_SRC = $(filter-out %.d.js, $(patsubst src/lib/%, lib/%, $(TS_SRC:%.ts=%.js)))
JS_SRC += lib/sqlite/sqlite3-emscripten.js

lib/%.js: src/lib/%.ts
	yarn build:ts

#### UMD
# API
dist/blogsearch.umd.js: $(filter-out lib/sqlite/%, $(JS_SRC))
	webpack \
		--config webpack.config.js \
		$(WEBPACK_OPTS) \
		-o $@
# Worker - files under lib/sqlite
dist/worker.umd.js: $(filter lib/sqlite/%, $(JS_SRC)) lib/sqlite/blogsearch.wasm
	webpack \
		--config webpack.worker.config.js \
		$(WEBPACK_OPTS) \
		-o $@

################################################################################
# Building WASM
################################################################################
dist/blogsearch.wasm: lib/sqlite/blogsearch.wasm
	mkdir -p $(dir $@)
	cp $^ $@

# These are represented as $(word {line_num}, $^) in the recipe
WASM_DEPS = \
	src/lib/sqlite/sqlite3-emscripten-post-js.js \
	sqlite-src/$(SQLITE_AMALGAMATION)/sqlite3.c \
	src/lib/sqlite/exported_functions.json \
	src/lib/sqlite/exported_runtime_methods.json

lib/sqlite/sqlite3-emscripten.js: lib/sqlite/blogsearch.wasm
lib/sqlite/blogsearch.wasm: $(WASM_DEPS)
	mkdir -p $(dir $@)
	emcc \
		$(EMCC_OPTS) \
		$(EMCC_SQLITE_FLAGS) \
		--post-js $(word 1, $^) \
		$(word 2, $^) \
		-s EXPORTED_FUNCTIONS=@$(word 3, $^) \
		-s EXTRA_EXPORTED_RUNTIME_METHODS=@$(word 4, $^) \
		-o $(@:.wasm=.js)
	mv $(@:.wasm=.js) lib/sqlite/sqlite3-emscripten.js

################################################################################
# Building SQLite
################################################################################
sqlite-src/$(SQLITE_AMALGAMATION)/sqlite3.c: cache/$(SQLITE_AMALGAMATION).zip
	mkdir -p sqlite-src
	echo '$(SQLITE_AMALGAMATION_ZIP_SHA1) ./cache/$(SQLITE_AMALGAMATION).zip' > cache/sha_$(SQLITE_AMALGAMATION).txt
	sha1sum -c cache/sha_$(SQLITE_AMALGAMATION).txt
	unzip -DD 'cache/$(SQLITE_AMALGAMATION).zip' -d sqlite-src/

cache/$(SQLITE_AMALGAMATION).zip:
	mkdir -p cache
	curl -LsSf '$(SQLITE_AMALGAMATION_ZIP_URL)' -o $@

################################################################################
# Building CSS
################################################################################
dist/blogsearch.css: src/styles/main.scss $(wildcard src/styles/*.scss)
	node-sass --output-style expanded $< \
  	| postcss --use autoprefixer -o $@

dist/blogsearch.min.map: dist/blogsearch.min.css
dist/blogsearch.min.css: dist/blogsearch.css
	postcss $< --use cssnano --map $(@:.css=.min.css) -o $@

################################################################################
# Etc.
################################################################################
.PHONY: clean

clean:
	-rm -rf dist
	-rm -rf lib
	-rm -rf sqlite-src
	-rm -rf lib-test
