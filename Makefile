GETTEXT_PACKAGE = searchbookmarks
PACKAGE_NAME    = gnome-shell-extension-$(GETTEXT_PACKAGE)
PACKAGE_VERSION = 2
EXTENSION_UUID  = $(GETTEXT_PACKAGE)@bmh1980de.gmail.com

FILES = chromium.js empty.js epiphany.js extension.js firefox.js \
        googlechrome.js metadata.json midori.js opera.js

INTLTOOL_UPDATE = XGETTEXT_ARGS="$(XGETTEXT_ARGS)" \
                  intltool-update -g $(GETTEXT_PACKAGE)
XGETTEXT_ARGS   = -d $(GETTEXT_PACKAGE) --from-code=UTF-8 -k_ -kN_ \
                  --copyright-holder='Marcus Habermehl' \
                  --package-name=$(PACKAGE_NAME) \
                  --package-version=$(PACKAGE_VERSION) \
                  --msgid-bugs-address=bmh1980de@gmail.com

DATADIR ?= /usr/share

ifeq ($(shell id -u),0)
	EXTENSIONDIR = $(DATADIR)/gnome-shell/extensions/$(EXTENSION_UUID)
	LOCALEDIR   ?= $(DATADIR)/locale
else
	EXTENSIONDIR = $(HOME)/.local/share/gnome-shell/extensions/$(EXTENSION_UUID)
	LOCALEDIR    = $(EXTENSIONDIR)/locale
endif

LINGUAS = $(shell cat po/LINGUAS)

all:
	@echo "dist      : create a source archive"
	@echo "extension : create an extension archive"
	@echo "install   : install the extension"
	@echo "update-po : update the PO files"
	@echo "update-pot: update the POT file"

clean:
	rm -rf $(PACKAGE_NAME)-$(PACKAGE_VERSION) locale

create-mo:
	set -e; \
	for i in $(LINGUAS); do \
		mkdir -p locale/$$i/LC_MESSAGES; \
		msgfmt -o locale/$$i/LC_MESSAGES/$(GETTEXT_PACKAGE).mo po/$$i; \
	done

dist:
	set -e; \
	mkdir $(PACKAGE_NAME)-$(PACKAGE_VERSION); \
	cp -ra $(FILES) Makefile po $(PACKAGE_NAME)-$(PACKAGE_VERSION); \
	if [ -d .git ]; then \
		git log > $(PACKAGE_NAME)-$(PACKAGE_VERSION)/ChangeLog; \
	fi; \
	tar -c --xz -f $(PACKAGE_NAME)-$(PACKAGE_VERSION).tar.xz \
		$(PACKAGE_NAME)-$(PACKAGE_VERSION)

extension: create-mo
	zip $(EXTENSION_UUID).zip $(FILES) $(shell find locale -type f)

install: create-mo
	set -e; \
	mkdir -p $(DESTDIR)$(EXTENSIONDIR) $(DESTDIR)$(LOCALEDIR); \
	cp -a $(FILES) $(DESTDIR)$(EXTENSIONDIR); \
	cp -a locale/* $(DESTDIR)$(LOCALEDIR)

update-po: update-pot
	set -e; \
	cd po; \
	for i in $(LINGUAS); do \
		$(INTLTOOL_UPDATE) -d $$i; \
	done

update-pot:
	set -e; \
	cd po; \
	$(INTLTOOL_UPDATE) -p; \
	sed -i 's|\(Content-Type: text/plain; charset=\)CHARSET|\1UTF-8|' \
	    $(GETTEXT_PACKAGE).pot

