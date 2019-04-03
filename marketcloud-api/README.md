[ ![Codeship Status for marketcloud/marketcloud-api](https://app.codeship.com/projects/528da3d0-fd68-0132-26da-46b29513b11c/status?branch=master)](https://app.codeship.com/projects/87791)

# Marketcloud Storefront API

This is the version 0 of the Marketcloud Storefront API

This started as a beta version, but evolved a lot. We managed to avoid breaking changes 
by doing only incremental updates. Somethings cannot be changed though, at least not elegantly, these changes will be added to next version (v1).



# Commit checklist

:white_check_mark: Run all tests (functional ,unit and E2E)

:white_check_mark: Your code is linted according to Standard Javascript Format

:white_check_mark: Push to Gitlab CI (git push gitlab master)

:white_check_mark: Check that CI has passed without issues


After Previous points are secured a push to production is possible, but before that:

:white_check_mark: Update the PUBLIC changelog at https://github.com/Marketcloud/storefront-api

:white_check_mark: Update/Close related issue (if any) at https://github.com/Marketcloud/storefront-api

:white_check_mark: Update the PRIVATE changelog in this repository with detailed information about relevant internal changes


Now we can finally push to master


# Troubleshooting
Main observability points for the marketcloud api are

* Live streaming of output at https://marketcloud-api.scm.azurewebsites.net
* Logged request/responses in our mongodb Logging DB
* Our Sentry account


