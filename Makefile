all:
	yarn build

dev:
	yarn build:dev

include build.mk

# Docker configuration
# When multiple jobs running (e.g. make -j2) The interactive TTY is not available
NUM_JOBS = $(patsubst -j%,%,$(filter -j%,$(MAKEFLAGS)))
INTERACTIVE = $(if $(NUM_JOBS),,$(shell [ -t 0 ] && echo 1))
DOCKER_OPT = \
	--rm \
	-v $$(pwd):/build \
	$(if $(INTERACTIVE),-it,) \
	$(if $(CI),,-u $$(id -u):$$(id -g))

# Every commands can be run in a docker container when *-in-docker is appended.
# e.g make start => make start-in-docker,
#			make test => make test-docker
%-in-docker:
	docker run $(DOCKER_OPT) \
		kbumsik/emscripten \
		make $(patsubst %-in-docker,%,$@)

# Just to work in the docker container, so you can run bash-in-docker
bash:
	bash
