# apex-styleguide
Our teams style guide for Apex.  For a human readable version, checkout this [page](https://pcon.github.io/apex-styleguide)

## Checkstyle Usage
1. Download the most recent version of the [checkstyle jar](https://sourceforge.net/projects/checkstyle/files/checkstyle/)
2. Generate a `checkstyle.properties` file
    ```basedir=/path/to/src```
3. Run checkstyle against a single file `java -jar checkstyle.jar -p checkstyle.properties -c apex_checks.xml /path/to/src/classes/MyClass.cls`