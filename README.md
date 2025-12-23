Отже все працює. Створює автоматично неймспейси і піднімає інфраструктуру.
Майже все те саме, що і в останній домашці. Теж 2 енви, 2 різні урли
Єдине що відрізняється, це використання CloudNativePG для бази даних.
Але з нею були нюанси. Дуууже багато часу потратив, щоб вирішити проблему з externalClusters
```
error HelmRelease/super-todo-staging.staging - Reconciler error cannot determine release state: unable to determine cluster state: Cluster/staging/super-todo-staging-cluster dry-run failed (Invalid): Cluster.postgresql.cnpg.io "super-todo-staging-cluster" is invalid: [spec.externalClusters: Invalid value: "null": spec.externalClusters in body must be of type array: "null", <nil>: Invalid value: "null": some validation rules were not checked because the object was invalid; correct the existing errors to complete validation]
```
Я встановив її як dependancy в чарті, спочатку. Але так і не зміг змусити її працювати. Реконсіл ніколи не проходив через помилку вище.
Тому я просто встановив її вручну, як ми зробили з dragonfly в домашках і все без проблем заранилося
Сама апка - це просто тудушка
